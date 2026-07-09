import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function Home() {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle>Wealth Manager</CardTitle>
          <CardDescription>
            Connect your financial life, understand your portfolio, and plan with
            confidence.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button nativeButton={false} render={<Link href="/sign-in" />}>
            Sign in
          </Button>
          <Button nativeButton={false} variant="outline" render={<Link href="/app" />}>
            Open app
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
