import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const backendBaseUrl =
  process.env.QUERYBOARD_BACKEND_URL ||
  process.env.NEXT_PUBLIC_QUERYBOARD_BACKEND_URL ||
  'http://127.0.0.1:8000'

function buildBackendUrl(pathname: string): string {
  return new URL(pathname, backendBaseUrl).toString()
}

async function parseResponsePayload(response: Response): Promise<unknown> {
  const text = await response.text()

  if (!text) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch {
    return { detail: text }
  }
}

export async function POST(request: Request) {
  const incomingFormData = await request.formData()
  const file = incomingFormData.get('file')

  if (!(file instanceof File)) {
    return NextResponse.json(
      { detail: 'A file upload is required.' },
      { status: 400 },
    )
  }

  const formData = new FormData()
  formData.append('file', file)

  try {
    const backendResponse = await fetch(buildBackendUrl('/api/upload'), {
      method: 'POST',
      body: formData,
      cache: 'no-store',
    })

    const payload = await parseResponsePayload(backendResponse)

    if (!backendResponse.ok) {
      return NextResponse.json(
        payload ?? { detail: 'Backend upload failed.' },
        { status: backendResponse.status },
      )
    }

    return NextResponse.json(payload, { status: backendResponse.status })
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown connection error.'

    return NextResponse.json(
      {
        detail: `Could not reach the backend service at ${backendBaseUrl}. ${detail}`,
      },
      { status: 502 },
    )
  }
}
