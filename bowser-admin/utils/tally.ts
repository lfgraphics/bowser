const TALLY_BRIDGE_URL = 'http://localhost:4000/tally';

type TallyStatus =
    | { status: 'No Company Opened' }
    | { status: 'Desired Company Opened'; companyName: string }
    | { status: 'Desired Company Not Opened'; companyName: string }
    | { status: 'Tally Not Opened' };

export const checkTallyStatus = async (): Promise<TallyStatus> => {
    const requestXML = `
    <ENVELOPE>
      <HEADER>
        <VERSION>1</VERSION>
        <TALLYREQUEST>Export</TALLYREQUEST>
        <TYPE>Collection</TYPE>
        <ID>COMPANY</ID>
      </HEADER>
      <BODY>
        <DESC>
          <STATICVARIABLES>
            <SVEXPORTFORMAT>xml</SVEXPORTFORMAT>
          </STATICVARIABLES>
        </DESC>
      </BODY>
    </ENVELOPE>
  `;

    try {
        const response = await fetch(TALLY_BRIDGE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/xml',
            },
            body: requestXML,
        });

        const responseXML = await response.text();

        // Check if no company is opened
        if (
            responseXML.includes('<COMPANY>0</COMPANY>') &&
            responseXML.includes('<COLLECTION>   </COLLECTION>')
        ) {
            return { status: 'No Company Opened' };
        }

        // Check if a company is opened
        const companyMatch = responseXML.match(/<COMPANY NAME="([^"]+)"/);
        if (companyMatch) {
            const companyName = companyMatch[1];
            if (companyName.includes('Indian Tankers')) {
                return { status: 'Desired Company Opened', companyName };
            } else {
                return { status: 'Desired Company Not Opened', companyName };
            }
        }

        return { status: 'Tally Not Opened' };
    } catch (error: unknown) {
        console.error('Error checking Tally status:', error);
        return { status: 'Tally Not Opened' };
    }
};
