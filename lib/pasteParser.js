function cleanField(str) {
  return str ? str.trim().replace(/^[:\-–=]\s*/, '').trim() : '';
}

export function parseWithRegex(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;

  const text = rawText.trim();
  const lines = text.split(/\r?\n/);
  const data = {
    accountNumber: '',
    clientName: '',
    contactNumber: '',
    address: '',
    issue: '',
    landmark: '',
    plan: '',
    taskType: 'REPAIR',
    referral: ''
  };

  if (/install|application|apply|new\s+line/i.test(text)) {
    data.taskType = 'INSTALL';
  } else if (/backjob|revisit|repeat/i.test(text)) {
    data.taskType = 'BACKJOB';
  } else if (/relocat/i.test(text)) {
    data.taskType = 'RELOCATION';
  } else if (/pull\s*out|disconnect/i.test(text)) {
    data.taskType = 'PULL_OUT';
  } else if (/mainline|fiber\s+cut|backbone/i.test(text)) {
    data.taskType = 'MAINLINE';
  } else if (/add\s*nap|nap/i.test(text)) {
    data.taskType = 'ADD_NAP';
  }

  for (const line of lines) {
    if (/^(?:acc(?:ount)?(?:\s*no|\s*#)?|account)\s*[:\-–=]/i.test(line)) {
      data.accountNumber = cleanField(line.split(/[:\-–=](.+)/)[1]);
    } else if (/^(?:client(?:\s*name)?|name|subscriber|cust(?:omer)?)\s*[:\-–=]/i.test(line)) {
      data.clientName = cleanField(line.split(/[:\-–=](.+)/)[1]);
    } else if (/^(?:contact(?:\s*no|\s*#)?|phone|mobile|cell(?:phone)?)\s*[:\-–=]/i.test(line)) {
      data.contactNumber = cleanField(line.split(/[:\-–=](.+)/)[1]);
    } else if (/^(?:address|addr|loc(?:ation)?)\s*[:\-–=]/i.test(line)) {
      data.address = cleanField(line.split(/[:\-–=](.+)/)[1]);
    } else if (/^(?:issue|concern|problem|complaint|trouble|status)\s*[:\-–=]/i.test(line)) {
      data.issue = cleanField(line.split(/[:\-–=](.+)/)[1]);
    } else if (/^(?:landmark|lcp|nap|port|ref(?:erence)?)\s*[:\-–=]/i.test(line)) {
      data.landmark = cleanField(line.split(/[:\-–=](.+)/)[1]);
    } else if (/^(?:plan|package|speed)\s*[:\-–=]/i.test(line)) {
      data.plan = cleanField(line.split(/[:\-–=](.+)/)[1]);
    }
  }

  const hasCoreFields = data.clientName || data.address || data.accountNumber;
  return hasCoreFields ? data : null;
}