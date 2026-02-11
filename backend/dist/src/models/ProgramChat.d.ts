import mongoose, { Document } from 'mongoose';
export type ChatType = 'open' | 'private';
export interface IProgramChat extends Document {
    programId: mongoose.Types.ObjectId;
    studentId: mongoose.Types.ObjectId;
    chatType: ChatType;
    participants: {
        student: mongoose.Types.ObjectId;
        OPS?: mongoose.Types.ObjectId;
        superAdmin?: mongoose.Types.ObjectId;
        admin?: mongoose.Types.ObjectId;
        counselor?: mongoose.Types.ObjectId;
    };
    createdAt: Date;
    updatedAt: Date;
}
declare const ProgramChat: mongoose.Model<IProgramChat, {}, {}, {}, mongoose.Document<unknown, {}, IProgramChat, {}, {}> & IProgramChat & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default ProgramChat;
//# sourceMappingURL=ProgramChat.d.ts.map