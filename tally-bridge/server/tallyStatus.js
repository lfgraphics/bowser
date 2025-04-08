import axios from 'axios';

export async function checkTallyStatus() {
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
    const response = await axios.post('http://localhost:9000', requestXML, {
      headers: { 'Content-Type': 'application/xml' },
    });
    const data = response.data;
    const match = data.match(/<COMPANY[^>]*?NAME="([^"]+)"/);
    if (match) return { status: 'Company is opened', companyName: match[1] };
    if (data.includes('<COMPANY>0</COMPANY>') && data.includes('<COLLECTION>   </COLLECTION>')) {
      return { status: 'No company is opened' };
    }
    return { status: 'Tally is open but no company detected' };
  } catch (err) {
    return { status: 'Tally is not opened' };
  }
}

export default { checkTallyStatus };
