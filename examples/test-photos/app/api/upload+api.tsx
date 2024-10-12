import fs from "node:fs";
import path from "node:path";
import sizeOf from "image-size";
import { addPhoto } from "~/code/db";

if (!fs.existsSync("./public/uploads")) {
  fs.mkdirSync("./public/uploads");
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const name = formData.get("name");
  const description = formData.get("description");

  if (file instanceof File) {
    const { name: fileName, type, size } = file;

    const id = crypto.randomUUID();
    const extension = path.extname(fileName);

    const fileBuffer = await file.arrayBuffer();
    fs.writeFileSync(
      `./public/uploads/${id}${extension}`,
      Buffer.from(fileBuffer)
    );

    const dimensions = sizeOf(`./public/uploads/${id}${extension}`);

    const fileRecord = addPhoto({
      id,
      name: name as string,
      description: description as string,
      type,
      size,
      path: `${id}${extension}`,
      width: dimensions.width ?? 0,
      height: dimensions.height ?? 0,
    });
    return new Response(JSON.stringify(fileRecord), { status: 200 });
  } else {
    return new Response(null, { status: 200 });
  }
}
