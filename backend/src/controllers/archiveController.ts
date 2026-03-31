import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import User from "../models/User";
import Student from "../models/Student";
import Parent from "../models/Parent";
import Admin from "../models/Admin";
import Counselor from "../models/Counselor";
import Ops from "../models/Ops";
import IvyExpert from "../models/IvyExpert";
import EduplanCoach from "../models/EduplanCoach";
import ServiceProvider from "../models/ServiceProvider";
import StudentServiceRegistration from "../models/StudentServiceRegistration";
import { USER_ROLE } from "../types/roles";

/**
 * GET /api/archive/super-admin
 * Super Admin: fetch all deactivated users with role-specific enrichment.
 * Query params: role, search
 */
export const getSuperAdminArchive = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const { role, search } = req.query;

    const filter: any = { isActive: false };

    if (role && typeof role === "string") {
      filter.role = role;
    }

    if (search && typeof search === "string") {
      const s = search.trim();
      if (s) {
        filter.$or = [
          { firstName: { $regex: s, $options: "i" } },
          { lastName: { $regex: s, $options: "i" } },
          { email: { $regex: s, $options: "i" } },
        ];
      }
    }

    const users = await User.find(filter)
      .select(
        "-password -emailVerificationToken -passwordResetToken -emailVerificationExpires -passwordResetExpires"
      )
      .sort({ updatedAt: -1 });

    // Enrich each user with role-specific profile data
    const enrichedUsers = await Promise.all(
      users.map(async (u) => {
        const obj: any = u.toObject();

        if (u.role === USER_ROLE.STUDENT) {
          const student = await Student.findOne({ userId: u._id })
            .populate({
              path: "adminId",
              select: "companyName userId",
              populate: {
                path: "userId",
                select: "firstName middleName lastName email",
              },
            })
            .populate({
              path: "counselorId",
              select: "userId",
              populate: {
                path: "userId",
                select: "firstName middleName lastName email",
              },
            })
            .lean();
          obj.profile = student;
          if (student) {
            const regCount = await StudentServiceRegistration.countDocuments({
              studentId: student._id,
            });
            obj.registrationCount = regCount;
          }
        } else if (u.role === USER_ROLE.PARENT) {
          const parent = await Parent.findOne({ userId: u._id })
            .populate({
              path: "studentIds",
              populate: {
                path: "userId",
                select: "firstName middleName lastName email",
              },
            })
            .lean();
          obj.profile = parent;
        } else if (u.role === USER_ROLE.ADMIN) {
          const admin = await Admin.findOne({ userId: u._id }).lean();
          obj.profile = admin;
        } else if (u.role === USER_ROLE.COUNSELOR) {
          const counselor = await Counselor.findOne({ userId: u._id }).lean();
          obj.profile = counselor;
        } else if (u.role === USER_ROLE.OPS) {
          const ops = await Ops.findOne({ userId: u._id }).lean();
          obj.profile = ops;
        } else if (u.role === USER_ROLE.IVY_EXPERT) {
          const ivyExpert = await IvyExpert.findOne({ userId: u._id }).lean();
          obj.profile = ivyExpert;
        } else if (u.role === USER_ROLE.EDUPLAN_COACH) {
          const coach = await EduplanCoach.findOne({ userId: u._id }).lean();
          obj.profile = coach;
        } else if (u.role === USER_ROLE.SERVICE_PROVIDER) {
          const sp = await ServiceProvider.findOne({ userId: u._id }).lean();
          obj.profile = sp;
        }

        return obj;
      })
    );

    // Role counts for stats
    const roleCounts: Record<string, number> = {};
    enrichedUsers.forEach((u) => {
      roleCounts[u.role] = (roleCounts[u.role] || 0) + 1;
    });

    return res.json({
      success: true,
      data: {
        users: enrichedUsers,
        total: enrichedUsers.length,
        roleCounts,
      },
    });
  } catch (error: any) {
    console.error("getSuperAdminArchive error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch archived users",
    });
  }
};

/**
 * GET /api/archive/staff
 * Staff roles: fetch deactivated students & parents within their scope.
 * Supported roles: ADMIN, COUNSELOR, OPS, IVY_EXPERT, EDUPLAN_COACH
 * Query params: search, type (student | parent)
 */
export const getStaffArchive = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const { search, type } = req.query;
    const searchStr =
      search && typeof search === "string" ? search.trim() : "";
    const typeFilter = type && typeof type === "string" ? type : "";

    // Determine scoped student IDs based on role
    let scopedStudentIds: string[] = [];

    if (user.role === USER_ROLE.ADMIN) {
      const admin = await Admin.findOne({ userId: user._id });
      if (admin) {
        const students = await Student.find({ adminId: admin._id }).select(
          "_id"
        );
        scopedStudentIds = students.map((s) => s._id.toString());
      }
    } else if (user.role === USER_ROLE.COUNSELOR) {
      const counselor = await Counselor.findOne({ userId: user._id });
      if (counselor) {
        const students = await Student.find({
          counselorId: counselor._id,
        }).select("_id");
        scopedStudentIds = students.map((s) => s._id.toString());
      }
    } else if (user.role === USER_ROLE.OPS) {
      const ops = await Ops.findOne({ userId: user._id });
      if (ops) {
        const registrations = await StudentServiceRegistration.find({
          $or: [
            { activeOpsId: ops._id },
            { activeOpsId: { $exists: false }, primaryOpsId: ops._id },
            { activeOpsId: null, primaryOpsId: ops._id },
          ],
        }).select("studentId");
        scopedStudentIds = [
          ...new Set(registrations.map((r) => r.studentId.toString())),
        ];
      }
    } else if (user.role === USER_ROLE.IVY_EXPERT) {
      const ivyExpert = await IvyExpert.findOne({ userId: user._id });
      if (ivyExpert) {
        const registrations = await StudentServiceRegistration.find({
          $or: [
            { activeIvyExpertId: ivyExpert._id },
            {
              activeIvyExpertId: { $exists: false },
              primaryIvyExpertId: ivyExpert._id,
            },
            { activeIvyExpertId: null, primaryIvyExpertId: ivyExpert._id },
          ],
        }).select("studentId");
        scopedStudentIds = [
          ...new Set(registrations.map((r) => r.studentId.toString())),
        ];
      }
    } else if (user.role === USER_ROLE.EDUPLAN_COACH) {
      const coach = await EduplanCoach.findOne({ userId: user._id });
      if (coach) {
        const registrations = await StudentServiceRegistration.find({
          $or: [
            { activeEduplanCoachId: coach._id },
            {
              activeEduplanCoachId: { $exists: false },
              primaryEduplanCoachId: coach._id,
            },
            { activeEduplanCoachId: null, primaryEduplanCoachId: coach._id },
          ],
        }).select("studentId");
        scopedStudentIds = [
          ...new Set(registrations.map((r) => r.studentId.toString())),
        ];
      }
    } else {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    let archivedStudents: any[] = [];
    let archivedParents: any[] = [];
    let archivedCounselors: any[] = [];

    // Get archived counselors (ADMIN only)
    if (user.role === USER_ROLE.ADMIN && (!typeFilter || typeFilter === "counselor")) {
      const counselors = await Counselor.find({ adminId: user._id })
        .populate(
          "userId",
          "firstName middleName lastName email profilePicture isActive createdAt updatedAt"
        )
        .lean();

      archivedCounselors = counselors.filter(
        (c: any) => c.userId && !c.userId.isActive
      );

      if (searchStr) {
        const q = searchStr.toLowerCase();
        archivedCounselors = archivedCounselors.filter((c: any) => {
          const name = `${c.userId.firstName || ""} ${c.userId.middleName || ""} ${c.userId.lastName || ""}`.toLowerCase();
          const email = (c.userId.email || "").toLowerCase();
          return name.includes(q) || email.includes(q);
        });
      }
    }

    // Get archived students
    if (!typeFilter || typeFilter === "student") {
      const students = await Student.find({
        _id: { $in: scopedStudentIds },
      })
        .populate(
          "userId",
          "firstName middleName lastName email profilePicture isActive createdAt updatedAt"
        )
        .populate({
          path: "adminId",
          select: "companyName userId",
          populate: {
            path: "userId",
            select: "firstName middleName lastName email",
          },
        })
        .populate({
          path: "counselorId",
          select: "userId",
          populate: {
            path: "userId",
            select: "firstName middleName lastName email",
          },
        })
        .lean();

      archivedStudents = students.filter(
        (s: any) => s.userId && !s.userId.isActive
      );

      // Apply search filter
      if (searchStr) {
        const q = searchStr.toLowerCase();
        archivedStudents = archivedStudents.filter((s: any) => {
          const name = `${s.userId.firstName || ""} ${s.userId.middleName || ""} ${s.userId.lastName || ""}`.toLowerCase();
          const email = (s.userId.email || "").toLowerCase();
          return name.includes(q) || email.includes(q);
        });
      }
    }

    // Get archived parents
    if (!typeFilter || typeFilter === "parent") {
      const parents = await Parent.find({
        studentIds: { $in: scopedStudentIds },
      })
        .populate(
          "userId",
          "firstName middleName lastName email profilePicture isActive createdAt updatedAt"
        )
        .populate({
          path: "studentIds",
          populate: {
            path: "userId",
            select: "firstName middleName lastName email",
          },
        })
        .lean();

      archivedParents = parents.filter(
        (p: any) => p.userId && !p.userId.isActive
      );

      if (searchStr) {
        const q = searchStr.toLowerCase();
        archivedParents = archivedParents.filter((p: any) => {
          const name = `${p.userId.firstName || ""} ${p.userId.middleName || ""} ${p.userId.lastName || ""}`.toLowerCase();
          const email = (p.userId.email || "").toLowerCase();
          return name.includes(q) || email.includes(q);
        });
      }
    }

    return res.json({
      success: true,
      data: {
        students: archivedStudents,
        parents: archivedParents,
        counselors: archivedCounselors,
        totalStudents: archivedStudents.length,
        totalParents: archivedParents.length,
        totalCounselors: archivedCounselors.length,
        total: archivedStudents.length + archivedParents.length + archivedCounselors.length,
      },
    });
  } catch (error: any) {
    console.error("getStaffArchive error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch archived data",
    });
  }
};
