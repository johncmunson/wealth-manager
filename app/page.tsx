import Image from "next/image"

export default function Home() {
  return (
    <main className="m-auto grid place-items-center gap-6 p-8 text-center">
      <Image
        className="dark:invert"
        src="/globe.svg"
        alt="Globe icon"
        width={100}
        height={100}
        priority
      />
      <h1 className="text-3xl font-semibold">Hello World</h1>
      <p className="max-w-md text-muted-foreground">
        Welcome to your new Next.js app.
      </p>
    </main>
  )
}
