import { VercelRequest, VercelResponse } from '@vercel/node'
import Airtable from 'airtable'

export default async (
  request: VercelRequest,
  response: VercelResponse
): Promise<void> => {
  // Only GET supported
  if (request.method !== 'GET') {
    response.status(501).send('Not implemented')
    return
  }

  const apiToken = process.env.AIRTABLE_API_KEY
  if (!apiToken) {
    response.status(500).send('Airtable API key not found in env.')
    return
  }

  const table = new Airtable({ apiKey: apiToken }).base('appkn1DkvgVI5jpME')(
    'Projects'
  )

  try {
    const records = await table.select({ view: 'Public View' }).all()
    const sanitizedRecords = records.map((p) =>
      subsetProps(p.fields, whitelistedProps)
    )
    // We intentionally use this instead of response.json() to have
    // the output pretty-printed. Because we deserve nice things!
    const out = JSON.stringify(sanitizedRecords, null, 2)
    response.setHeader('Content-Type', 'application/json')
    response.status(200).send(out)
  } catch (e) {
    response
      .status(500)
      .send(`Sorry, this didn’t work, pull requests welcome :)`)
  }
}

function subsetProps<K extends string | number | symbol, V>(
  obj: Record<K, V>,
  props: readonly K[]
): Record<typeof props[number], V> {
  const out = {} as Record<K, V>
  for (const key of props) {
    out[key] = obj[key]
  }
  return out
}

const whitelistedProps = [
  'csName',
  'csSlug',
  'enName',
  'enSlug',
  'csTagline',
  'enTagline',
  'logoUrl',
  'coverUrl',
  'csDescription',
  'enDescription',
  'csContributeText',
  'enContributeText',
  'url',
  'trelloUrl',
  'slackChannelUrl',
  'githubUrl',
  'slackChannelName',
  'finished',
  'highlighted',
  'draft',
] as const
