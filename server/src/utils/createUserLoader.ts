import DataLoader from "dataloader";
import { User } from "../entities/User";

// Group individual queries by id into a batch query.
export const createUserLoader = () =>
  new DataLoader<number, User>(async (keys) => {
    const users = await User.findByIds(keys as number[]);
    const map: Record<number, User> = {}
    users.forEach(u => {
      map[u.id] = u;
    })
    // Must return an object, not an array.
    return keys.map((userId) => map[userId]);
  });
