import DataLoader from "dataloader";
import { Updoot } from "../entities/Updoot";

// Group individual queries by id into a batch query.
export const createUpdootLoader = () =>
  new DataLoader<{postId: number, userId: number}, Updoot | null>(async (keys) => {
    const updoots = await Updoot.findByIds(keys as any)
    const map: Record<string, Updoot> = {}
    updoots.forEach(updoot => {
      map[`${updoot.userId}&${updoot.postId}`] = updoot;
    })
    // Must return an object, not an array.
    return keys.map((key) => map[`${key.userId}&${key.postId}`]);
  });
