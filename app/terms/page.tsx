import Link from 'next/link'

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-16">
      <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card/60 p-8">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">QueryBoard</p>
        <h1 className="mt-3 text-4xl font-bold text-foreground">Terms of Service</h1>
        <p className="mt-4 text-muted-foreground">
          This demo is for hackathon evaluation only. Accounts, authentication, and generated insights
          are provided as a product prototype and should not be treated as a production service.
        </p>
        <div className="mt-8 space-y-6 text-sm leading-7 text-muted-foreground">
          <p>
            By using this demo, you understand that login is mocked, data outputs are illustrative,
            and service availability may change during judging and demos.
          </p>
          <p>
            Do not upload sensitive personal, financial, or regulated data into the demo environment.
          </p>
          <p>
            Feedback, screenshots, and demo usage may be used to improve the project after the hackathon.
          </p>
        </div>
        <div className="mt-10">
          <Link href="/register" className="text-primary hover:text-primary/80 transition-colors">
            Back to registration
          </Link>
        </div>
      </div>
    </main>
  )
}
