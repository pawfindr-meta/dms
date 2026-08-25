import { parseWithRegex } from '../lib/pasteParser.js';

const samplePaste = `
Repair Concern:
Acc: 13-09162023-0001
Name: Constancia Almanon
Address: 4767 D Martin St. GTDL
Landmark: L2 N2 P1
Issue: LOS Blinking Red Light
Contact: 09070746153
`;

console.log('--- Testing Regex Parser on Raw Paste ---');
const result = parseWithRegex(samplePaste);
console.log('Parsed Output:\n', JSON.stringify(result, null, 2));