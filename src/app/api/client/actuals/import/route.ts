import { ActualServiceProvider } from "@/domain/services/actualService";
import type { ActualService } from "@/domain/services/actualService";
import { Endpoint, Auth, Require, BadRequestError, type Ctx } from "@/domain/decorators/controller";

type Deps = { actuals: ActualService };

/** 2 MB is roughly 40,000 rows — well past the row cap the service enforces. */
const MAX_BYTES = 2 * 1024 * 1024;

/**
 * CSV import.
 *
 * No `Body()` step: that one reads JSON, and this is multipart. The file is
 * read here and the parsing happens in the service, so a seed script or a test
 * can import a string without constructing a FormData.
 *
 * Answers 200 even when rows were rejected. A file of forty lines with two bad
 * ones lands thirty-eight, and `data.errors` says which two — refusing the
 * whole file would make the user hunt for a problem we already located.
 */
export const POST = Endpoint<undefined, Deps>(
  Auth(),
  Require({ actuals: ActualServiceProvider }),
  async ({ user, req, deps }: Ctx<undefined, Deps>) => {
    let form: FormData;
    try {
      form = await req.formData();
    } catch (cause) {
      throw new BadRequestError("Expected a file upload", cause);
    }

    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new BadRequestError('No file was attached under the field "file"');
    }

    if (file.size > MAX_BYTES) {
      throw new BadRequestError("The file is larger than 2 MB");
    }

    return {
      message: "Import complete",
      data: await deps.actuals.importCsv(user!.id, await file.text()),
    };
  }
);
