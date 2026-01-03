import Controls from "@/components/cover/Controls";
import Canvas from "@/components/cover/Canvas";
import ClientOnly from "@/components/ClientOnly";

export default function Home() {
  return (
    <main className="flex flex-col-reverse md:flex-row h-screen w-full bg-background overflow-hidden">
      <ClientOnly>
        <Controls />
        <Canvas />
      </ClientOnly>
    </main>
  );
}
# 123
