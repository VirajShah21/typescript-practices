import Reference from "@/components/reference/reference";
import practices from "@/data/practices.json";
import sources from "@/data/sources.json";

export default function Home() {
  return <Reference practices={practices} sources={sources} />;
}
