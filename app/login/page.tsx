import { SignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const { userId } = await auth();
  if (userId) redirect("/");

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-glow-brand" />
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-40" />

      <div className="relative z-10 mb-8 text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground shadow-lg shadow-primary/20">
          P
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Welcome to PostPilot
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to manage and publish your social posts
        </p>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <SignIn
          routing="hash"
          signUpUrl="/login"
          fallbackRedirectUrl="/"
          appearance={{
            elements: {
              rootBox: "w-full",
              cardBox: "w-full shadow-2xl",
            },
          }}
        />
      </div>
    </div>
  );
}
