/**
 * Resolve IvyExpert._id from a User._id.
 * Used across all ivy controllers to map the authenticated user
 * to their IvyExpert document (since activeIvyExpertId stores IvyExpert._id).
 */
export declare const resolveIvyExpertId: (userId: string) => Promise<string>;
/**
 * Resolve Student._id from a User._id.
 */
export declare const resolveStudentId: (userId: string) => Promise<string>;
//# sourceMappingURL=resolveRole.d.ts.map