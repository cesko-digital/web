import { VercelRequest, VercelResponse } from '@vercel/node'
import Airtable from 'airtable'

interface Event {
  Attendees?: string[]
}

export default async (
  req: VercelRequest,
  res: VercelResponse
): Promise<void> => {
  // Only POST supported
  if (req.method !== 'POST') {
    res.status(501).send('Not implemented')
    return
  }

  const apiToken = process.env.AIRTABLE_API_KEY
  if (!apiToken) {
    res.status(500).send('Airtable API key not found in env.')
    return
  }

  const base = new Airtable({ apiKey: apiToken }).base('appkn1DkvgVI5jpME')

  try {
    //
    // 1. Check arguments
    //
    const slackUserId = req.body?.userId
    if (!slackUserId) {
      res.status(400).send("Required 'userId' argument missing.")
      return
    }
    const eventId = req.body?.eventId
    if (!eventId) {
      res.status(400).send("Required 'eventId' argument missing.")
      return
    }

    //
    // 2. Get user details to translate userId into Airtable record ID
    //
    const userTable = base('Slack Users')
    const matchingUserRecords = await userTable
      .select({
        filterByFormula: `{Slack: ID} = '${slackUserId}'`,
      })
      .all()
    if (matchingUserRecords.length !== 1) {
      res.status(400).send('Invalid number of user records matching given ID.')
      return
    }
    const airtableUserId = matchingUserRecords[0].id
    if (!airtableUserId) {
      res.status(500).send('Cannot translate user ID to Airtable record ID.')
      return
    }

    //
    // 3. Add user to Attendees if not already present
    //

    // TBD: Is this a race condition? It probably is:
    // https://community.airtable.com/t/append-linked-record-using-api/39420
    // Would the window for trouble be smaller if we wrote to the User database
    // instead of events?
    const eventTable = base('Events')
    const event: Airtable.Record<Event> = await eventTable.find(eventId)
    const attendees = event.fields.Attendees || []
    if (!attendees.includes(airtableUserId)) {
      await eventTable.update(eventId, {
        Attendees: attendees.concat([airtableUserId]),
      })
    }
    res.status(200).send('Thanks, be seeing you!')
  } catch (e) {
    res.status(500).send('Well, this didn’t work, sorry.')
  }
}
