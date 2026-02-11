import User from '../models/ivy/User';

export const getUsersByRole = async (role: string) => {
  const users = await User.find({ role }).select('_id firstName middleName lastName email role');
  return users;
};

