function e(e,t){let n=e=>String(e||``).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`).replace(/'/g,`&apos;`),r=e.filter(e=>e.lat&&e.lng).map(e=>{let t=[];return e.description&&t.push(e.description),e.date&&t.push(`Date: ${e.date}`),e.time_start&&t.push(`Time: ${e.time_start}${e.time_end?` - `+e.time_end:``}`),e.cost&&t.push(`Cost: ${e.cost}`),e.address&&t.push(`Address: ${e.address}`),e.contact&&t.push(`Contact: ${e.contact}`),e.source_url&&t.push(`URL: ${e.source_url}`),`    <Placemark>
      <name>${n(e.name)}</name>
      <description>${n(t.join(`
`))}</description>
      <Point>
        <coordinates>${e.lng},${e.lat},0</coordinates>
      </Point>
    </Placemark>`}).join(`
`);return`<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${n(t||`Activities`)}</name>
${r}
  </Document>
</kml>`}function t(t,n){let r=e(Array.isArray(t)?t:t&&t.activities||[],n),i=new Blob([r],{type:`application/vnd.google-earth.kml+xml`}),a=URL.createObjectURL(i),o=document.createElement(`a`);o.href=a,o.download=(n||`map`)+`.kml`,o.click(),URL.revokeObjectURL(a)}export{t as exportKml};