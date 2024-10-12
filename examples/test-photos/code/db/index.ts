import fs from "node:fs";
import path from "node:path";

export type Photo = {
  id: string;
  name: string;
  description: string;
  path: string;
  url?: string;
  type: string;
  size: number;
  width: number;
  height: number;
};

const PHOTOS_JSON_PATH = path.join(process.cwd(), "photos.json");
if (!fs.existsSync(PHOTOS_JSON_PATH)) {
  fs.writeFileSync(PHOTOS_JSON_PATH, JSON.stringify([]));
}

export const getPhoto = (id: string): Photo | undefined => {
  const photos = JSON.parse(fs.readFileSync(PHOTOS_JSON_PATH, "utf8"));
  return photos.find((photo: any) => photo.id === id);
};

export const getPhotos = (): Photo[] => {
  const photos = JSON.parse(fs.readFileSync(PHOTOS_JSON_PATH, "utf8"));
  return photos;
};

export const addPhoto = (photo: Photo) => {
  const photos = JSON.parse(fs.readFileSync(PHOTOS_JSON_PATH, "utf8"));
  photos.push(photo);
  fs.writeFileSync(PHOTOS_JSON_PATH, JSON.stringify(photos));
};
