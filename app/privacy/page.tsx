import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-16">
      <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card/60 p-8">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">QueryBoard</p>
        <h1 className="mt-3 text-4xl font-bold text-foreground">Privacy Policy</h1>
        <p className="mt-4 text-muted-foreground">
          This hackathon build uses a mocked authentication flow. For demo purposes, sign-in data is not
          validated against a live identity provider before access is granted.
        </p>
        <div className="mt-8 space-y-6 text-sm leading-7 text-muted-foreground">
          <p>
            In the current prototype, any email entered during login or registration is used only to shape
            the demo user profile shown in the UI.
          </p>
          <p>
            Avoid entering passwords or information you would not want to use in a public demonstration.
          </p>
          <p>
            If the project moves beyond the hackathon phase, this page should be replaced with a production
            privacy policy that reflects the final authentication and data handling architecture.
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
