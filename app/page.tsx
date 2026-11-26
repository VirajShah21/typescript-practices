import Reference from "@/components/reference/reference";
import practices from "@/data/practices.json";
import sources from "@/data/sources.json";

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const single = (key: string) => typeof params[key] === "string" ? params[key] as string : "";
  const requestedView = single("view");
  const initialView = requestedView === "integrations" || requestedView === "sources" ? requestedView : "reference";
  return <Reference practices={practices} sources={sources} initialView={initialView} initialPractice={single("practice")} />;
}
