import mongoose from 'mongoose';
import { IAcademicDocument } from '../models/ivy/AcademicDocument';
import { IAcademicEvaluation } from '../models/ivy/AcademicEvaluation';
import { AcademicDocumentType } from '../types/AcademicDocumentType';
/** Student uploads academic document */
export declare const uploadAcademicDocument: (studentIvyServiceId: string, studentId: string, documentType: AcademicDocumentType, file: Express.Multer.File, customLabel?: string) => Promise<IAcademicDocument>;
/** Recalculates the mean score for Pointer 1 */
export declare const refreshPointer1MeanScore: (studentIvyServiceId: string) => Promise<number>;
/** Ivy Expert evaluates a specific academic document */
export declare const evaluateAcademicDocument: (studentIvyServiceId: string, academicDocumentId: string, ivyExpertId: string, score: number, feedback?: string) => Promise<IAcademicEvaluation>;
/** Get Pointer 1 status/documents with evaluations */
export declare const getAcademicStatus: (studentIdOrServiceId: string, useServiceId?: boolean) => Promise<{
    studentIvyServiceId: mongoose.Types.ObjectId;
    documents: {
        evaluation: any;
        studentIvyServiceId: mongoose.Types.ObjectId;
        documentType: AcademicDocumentType;
        customLabel?: string | undefined;
        fileUrl: string;
        fileName: string;
        fileSize: number;
        mimeType: string;
        uploadedAt: Date;
        _id: mongoose.Types.ObjectId;
        $assertPopulated: <Paths = {}>(path: string | string[], values?: Partial<Paths> | undefined) => Omit<IAcademicDocument, keyof Paths> & Paths;
        $clearModifiedPaths: () => IAcademicDocument;
        $clone: () => IAcademicDocument;
        $createModifiedPathsSnapshot: () => mongoose.ModifiedPathsSnapshot;
        $getAllSubdocs: () => mongoose.Document[];
        $ignore: (path: string) => void;
        $isDefault: (path?: string) => boolean;
        $isDeleted: (val?: boolean) => boolean;
        $getPopulatedDocs: () => mongoose.Document[];
        $inc: (path: string | string[], val?: number) => IAcademicDocument;
        $isEmpty: (path: string) => boolean;
        $isValid: (path: string) => boolean;
        $locals: mongoose.FlattenMaps<Record<string, unknown>>;
        $markValid: (path: string) => void;
        $model: {
            <ModelType = mongoose.Model<unknown, {}, {}, {}, mongoose.Document<unknown, {}, unknown, {}, {}> & {
                _id: mongoose.Types.ObjectId;
            } & {
                __v: number;
            }, any>>(name: string): ModelType;
            <ModelType = mongoose.Model<any, {}, {}, {}, any, any>>(): ModelType;
        };
        $op: "save" | "validate" | "remove" | null;
        $restoreModifiedPathsSnapshot: (snapshot: mongoose.ModifiedPathsSnapshot) => IAcademicDocument;
        $session: (session?: mongoose.ClientSession | null) => mongoose.ClientSession | null;
        $set: {
            (path: string | Record<string, any>, val: any, type: any, options?: mongoose.DocumentSetOptions): IAcademicDocument;
            (path: string | Record<string, any>, val: any, options?: mongoose.DocumentSetOptions): IAcademicDocument;
            (value: string | Record<string, any>): IAcademicDocument;
        };
        $where: mongoose.FlattenMaps<Record<string, unknown>>;
        baseModelName?: string | undefined;
        collection: mongoose.FlattenMaps<mongoose.Collection<mongoose.mongo.BSON.Document>>;
        db: mongoose.FlattenMaps<mongoose.Connection>;
        deleteOne: (options?: mongoose.QueryOptions) => any;
        depopulate: <Paths = {}>(path?: string | string[]) => mongoose.MergeType<IAcademicDocument, Paths>;
        directModifiedPaths: () => Array<string>;
        equals: (doc: mongoose.Document<mongoose.Types.ObjectId, any, any, Record<string, any>, {}>) => boolean;
        errors?: mongoose.Error.ValidationError | undefined;
        get: {
            <T extends string | number | symbol>(path: T, type?: any, options?: any): any;
            (path: string, type?: any, options?: any): any;
        };
        getChanges: () => mongoose.UpdateQuery<IAcademicDocument>;
        id?: any;
        increment: () => IAcademicDocument;
        init: (obj: mongoose.AnyObject, opts?: mongoose.AnyObject) => IAcademicDocument;
        invalidate: {
            <T extends string | number | symbol>(path: T, errorMsg: string | NativeError, value?: any, kind?: string): NativeError | null;
            (path: string, errorMsg: string | NativeError, value?: any, kind?: string): NativeError | null;
        };
        isDirectModified: {
            <T extends string | number | symbol>(path: T | T[]): boolean;
            (path: string | Array<string>): boolean;
        };
        isDirectSelected: {
            <T extends string | number | symbol>(path: T): boolean;
            (path: string): boolean;
        };
        isInit: {
            <T extends string | number | symbol>(path: T): boolean;
            (path: string): boolean;
        };
        isModified: {
            <T extends string | number | symbol>(path?: T | T[] | undefined, options?: {
                ignoreAtomics?: boolean;
            } | null): boolean;
            (path?: string | Array<string>, options?: {
                ignoreAtomics?: boolean;
            } | null): boolean;
        };
        isNew: boolean;
        isSelected: {
            <T extends string | number | symbol>(path: T): boolean;
            (path: string): boolean;
        };
        markModified: {
            <T extends string | number | symbol>(path: T, scope?: any): void;
            (path: string, scope?: any): void;
        };
        model: {
            <ModelType = mongoose.Model<unknown, {}, {}, {}, mongoose.Document<unknown, {}, unknown, {}, {}> & {
                _id: mongoose.Types.ObjectId;
            } & {
                __v: number;
            }, any>>(name: string): ModelType;
            <ModelType = mongoose.Model<any, {}, {}, {}, any, any>>(): ModelType;
        };
        modifiedPaths: (options?: {
            includeChildren?: boolean;
        }) => Array<string>;
        overwrite: (obj: mongoose.AnyObject) => IAcademicDocument;
        $parent: () => mongoose.Document | undefined;
        populate: {
            <Paths = {}>(path: string | mongoose.PopulateOptions | (string | mongoose.PopulateOptions)[]): Promise<mongoose.MergeType<IAcademicDocument, Paths>>;
            <Paths = {}>(path: string, select?: string | mongoose.AnyObject, model?: mongoose.Model<any>, match?: mongoose.AnyObject, options?: mongoose.PopulateOptions): Promise<mongoose.MergeType<IAcademicDocument, Paths>>;
        };
        populated: (path: string) => any;
        replaceOne: (replacement?: mongoose.AnyObject, options?: mongoose.QueryOptions | null) => mongoose.Query<any, IAcademicDocument, {}, unknown, "find", Record<string, never>>;
        save: (options?: mongoose.SaveOptions) => Promise<IAcademicDocument>;
        schema: mongoose.FlattenMaps<mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any>, {}, {}, {}, {}, mongoose.DefaultSchemaOptions, {
            [x: number]: unknown;
            [x: symbol]: unknown;
            [x: string]: unknown;
        }, mongoose.Document<unknown, {}, mongoose.FlatRecord<{
            [x: number]: unknown;
            [x: symbol]: unknown;
            [x: string]: unknown;
        }>, {}, mongoose.ResolveSchemaOptions<mongoose.DefaultSchemaOptions>> & mongoose.FlatRecord<{
            [x: number]: unknown;
            [x: symbol]: unknown;
            [x: string]: unknown;
        }> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }>>;
        set: {
            <T extends string | number | symbol>(path: T, val: any, type: any, options?: mongoose.DocumentSetOptions): IAcademicDocument;
            (path: string | Record<string, any>, val: any, type: any, options?: mongoose.DocumentSetOptions): IAcademicDocument;
            (path: string | Record<string, any>, val: any, options?: mongoose.DocumentSetOptions): IAcademicDocument;
            (value: string | Record<string, any>): IAcademicDocument;
        };
        toJSON: {
            (options: mongoose.ToObjectOptions & {
                versionKey: false;
                virtuals: true;
                flattenObjectIds: true;
            }): Omit<{
                [x: string]: any;
            }, "__v">;
            (options: mongoose.ToObjectOptions & {
                virtuals: true;
                flattenObjectIds: true;
            }): {
                [x: string]: any;
            };
            (options: mongoose.ToObjectOptions & {
                versionKey: false;
                virtuals: true;
            }): Omit<any, "__v">;
            (options: mongoose.ToObjectOptions & {
                versionKey: false;
                flattenObjectIds: true;
            }): {
                [x: string]: any;
                [x: number]: any;
                [x: symbol]: any;
            };
            (options: mongoose.ToObjectOptions & {
                virtuals: true;
            }): any;
            (options: mongoose.ToObjectOptions & {
                versionKey: false;
            }): Omit<any, "__v">;
            (options?: mongoose.ToObjectOptions & {
                flattenMaps?: true;
                flattenObjectIds?: false;
            }): mongoose.FlattenMaps<any>;
            (options: mongoose.ToObjectOptions & {
                flattenObjectIds: false;
            }): mongoose.FlattenMaps<any>;
            (options: mongoose.ToObjectOptions & {
                flattenObjectIds: true;
            }): {
                [x: string]: any;
            };
            (options: mongoose.ToObjectOptions & {
                flattenMaps: false;
            }): any;
            (options: mongoose.ToObjectOptions & {
                flattenMaps: false;
                flattenObjectIds: true;
            }): any;
            <T = any>(options?: mongoose.ToObjectOptions & {
                flattenMaps?: true;
                flattenObjectIds?: false;
            }): mongoose.FlattenMaps<T>;
            <T = any>(options: mongoose.ToObjectOptions & {
                flattenObjectIds: false;
            }): mongoose.FlattenMaps<T>;
            <T = any>(options: mongoose.ToObjectOptions & {
                flattenObjectIds: true;
            }): mongoose.ObjectIdToString<mongoose.FlattenMaps<T>>;
            <T = any>(options: mongoose.ToObjectOptions & {
                flattenMaps: false;
            }): T;
            <T = any>(options: mongoose.ToObjectOptions & {
                flattenMaps: false;
                flattenObjectIds: true;
            }): mongoose.ObjectIdToString<T>;
        };
        toObject: {
            (options: mongoose.ToObjectOptions & {
                versionKey: false;
                virtuals: true;
                flattenObjectIds: true;
            }): Omit<any, "__v">;
            (options: mongoose.ToObjectOptions & {
                virtuals: true;
                flattenObjectIds: true;
            }): any;
            (options: mongoose.ToObjectOptions & {
                versionKey: false;
                flattenObjectIds: true;
            }): Omit<any, "__v">;
            (options: mongoose.ToObjectOptions & {
                versionKey: false;
                virtuals: true;
            }): Omit<any, "__v">;
            (options: mongoose.ToObjectOptions & {
                virtuals: true;
            }): any;
            (options: mongoose.ToObjectOptions & {
                versionKey: false;
            }): Omit<any, "__v">;
            (options: mongoose.ToObjectOptions & {
                flattenObjectIds: true;
            }): any;
            (options?: mongoose.ToObjectOptions): any;
            <T>(options?: mongoose.ToObjectOptions): mongoose.Require_id<T> & {
                __v: number;
            };
        };
        unmarkModified: {
            <T extends string | number | symbol>(path: T): void;
            (path: string): void;
        };
        updateOne: (update?: mongoose.UpdateWithAggregationPipeline | mongoose.UpdateQuery<IAcademicDocument> | undefined, options?: mongoose.QueryOptions | null) => mongoose.Query<any, IAcademicDocument, {}, unknown, "find", Record<string, never>>;
        validate: {
            <T extends string | number | symbol>(pathsToValidate?: T | T[] | undefined, options?: mongoose.AnyObject): Promise<void>;
            (pathsToValidate?: mongoose.pathsToValidate, options?: mongoose.AnyObject): Promise<void>;
            (options: {
                pathsToSkip?: mongoose.pathsToSkip;
            }): Promise<void>;
        };
        validateSync: {
            (options: {
                pathsToSkip?: mongoose.pathsToSkip;
                [k: string]: any;
            }): mongoose.Error.ValidationError | null;
            <T extends string | number | symbol>(pathsToValidate?: T | T[] | undefined, options?: mongoose.AnyObject): mongoose.Error.ValidationError | null;
            (pathsToValidate?: mongoose.pathsToValidate, options?: mongoose.AnyObject): mongoose.Error.ValidationError | null;
        };
        __v: number;
    }[];
}>;
/** Get or create academic data for a student */
export declare const getAcademicData: (studentId: string, studentIvyServiceId: string) => Promise<mongoose.Document<unknown, {}, import("../models/ivy/AcademicData").IAcademicData, {}, {}> & import("../models/ivy/AcademicData").IAcademicData & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}>;
/** Add a new section to formal or informal */
export declare const addSection: (studentId: string, studentIvyServiceId: string, examName: string, tab?: "formal" | "informal") => Promise<mongoose.Document<unknown, {}, import("../models/ivy/AcademicData").IAcademicData, {}, {}> & import("../models/ivy/AcademicData").IAcademicData & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}>;
/** Add a sub-section to a section */
export declare const addSubSection: (studentId: string, studentIvyServiceId: string, sectionId: string, testType: string, month: string, year: number, tab?: "formal" | "informal") => Promise<mongoose.Document<unknown, {}, import("../models/ivy/AcademicData").IAcademicData, {}, {}> & import("../models/ivy/AcademicData").IAcademicData & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}>;
/** Update a sub-section */
export declare const updateSubSection: (studentId: string, studentIvyServiceId: string, sectionId: string, subSectionId: string, updates: any, tab?: "formal" | "informal") => Promise<mongoose.Document<unknown, {}, import("../models/ivy/AcademicData").IAcademicData, {}, {}> & import("../models/ivy/AcademicData").IAcademicData & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}>;
/** Add a subject to a sub-section */
export declare const addSubject: (studentId: string, studentIvyServiceId: string, sectionId: string, subSectionId: string, name: string, marksObtained: number, totalMarks: number, tab?: "formal" | "informal") => Promise<mongoose.Document<unknown, {}, import("../models/ivy/AcademicData").IAcademicData, {}, {}> & import("../models/ivy/AcademicData").IAcademicData & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}>;
/** Update a subject */
export declare const updateSubject: (studentId: string, studentIvyServiceId: string, sectionId: string, subSectionId: string, subjectId: string, updates: any, tab?: "formal" | "informal") => Promise<mongoose.Document<unknown, {}, import("../models/ivy/AcademicData").IAcademicData, {}, {}> & import("../models/ivy/AcademicData").IAcademicData & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}>;
/** Delete a section */
export declare const deleteSection: (studentId: string, studentIvyServiceId: string, sectionId: string, tab?: "formal" | "informal") => Promise<mongoose.Document<unknown, {}, import("../models/ivy/AcademicData").IAcademicData, {}, {}> & import("../models/ivy/AcademicData").IAcademicData & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}>;
/** Delete a sub-section */
export declare const deleteSubSection: (studentId: string, studentIvyServiceId: string, sectionId: string, subSectionId: string, tab?: "formal" | "informal") => Promise<mongoose.Document<unknown, {}, import("../models/ivy/AcademicData").IAcademicData, {}, {}> & import("../models/ivy/AcademicData").IAcademicData & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}>;
/** Delete a subject */
export declare const deleteSubject: (studentId: string, studentIvyServiceId: string, sectionId: string, subSectionId: string, subjectId: string, tab?: "formal" | "informal") => Promise<mongoose.Document<unknown, {}, import("../models/ivy/AcademicData").IAcademicData, {}, {}> & import("../models/ivy/AcademicData").IAcademicData & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}>;
/** Update weightages for informal sections */
export declare const updateWeightages: (studentId: string, studentIvyServiceId: string, weightages: {
    sectionId: string;
    weightage: number;
}[]) => Promise<mongoose.Document<unknown, {}, import("../models/ivy/AcademicData").IAcademicData, {}, {}> & import("../models/ivy/AcademicData").IAcademicData & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}>;
/** Get current academic excellence score */
export declare const getAcademicExcellenceScore: (_studentId: string, studentIvyServiceId: string) => Promise<{
    finalScore: number;
    documentAvg: number;
    weightedScoreSum: number;
    evaluatedDocsCount: number;
    informalSectionsWithScores: number;
}>;
//# sourceMappingURL=pointer1.service.d.ts.map