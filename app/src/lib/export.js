// Copyright 2026 Carlo Cancellieri
// All rights reserved. Proprietary license.

/**
 * Generate a KML document string from an array of activities.
 */
export function generateKML(activities, title) {
  const escapeXml = (str) =>
    String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  const placemarks = activities
    .filter((a) => a.lat && a.lng)
    .map((a) => {
      const descParts = [];
      if (a.description) descParts.push(a.description);
      if (a.date) descParts.push(`Date: ${a.date}`);
      if (a.time_start) descParts.push(`Time: ${a.time_start}${a.time_end ? ' - ' + a.time_end : ''}`);
      if (a.cost) descParts.push(`Cost: ${a.cost}`);
      if (a.address) descParts.push(`Address: ${a.address}`);
      if (a.contact) descParts.push(`Contact: ${a.contact}`);
      if (a.source_url) descParts.push(`URL: ${a.source_url}`);

      return `    <Placemark>
      <name>${escapeXml(a.name)}</name>
      <description>${escapeXml(descParts.join('\n'))}</description>
      <Point>
        <coordinates>${a.lng},${a.lat},0</coordinates>
      </Point>
    </Placemark>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXml(title || 'Activities')}</name>
${placemarks}
  </Document>
</kml>`;
}
