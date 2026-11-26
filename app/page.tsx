import Reference from "@/components/reference/reference";
import { practices, sources, metadata } from "@/lib/catalog";

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const single = (key: string) => typeof params[key] === "string" ? params[key] as string : "";
  const requestedView = single("view");
  const initialView = requestedView === "integrations" || requestedView === "sources" ? requestedView : "reference";
  const initialFilters = Object.fromEntries(["q", "category", "source", "context", "environment", "tag"].map(key => [key, single(key)]));
  return <Reference practices={practices} sources={sources} metadata={metadata} initialView={initialView} initialPractice={single("practice")} initialFilters={initialFilters} />;
}
