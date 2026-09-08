import { getPublicCatalog } from "@/db/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const catalog = await getPublicCatalog();
    return Response.json(catalog, {
      headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
    });
  } catch (error) {
    console.error("public_catalog_failed", error);
    return Response.json(
      { error: "Data layanan belum dapat dimuat. Silakan coba kembali." },
      { status: 500 },
    );
  }
}
