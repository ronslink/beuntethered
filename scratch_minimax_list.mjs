async function testModels() {
  const res = await fetch("https://api.minimaxi.chat/v1/models", {
    headers: {
      "Authorization": "Bearer sk-cp-6iv2sCSdlBr8-Pz32KSuwHVcoSvrQ1n7W8DwcVb5HVTzA72uSm-9tAonRgbtQ0EfpDt3itq9VldikdLqPIl719Z-Y0du4vsGmHKP7U64kvjaqSkA72p39bE"
    }
  });

  if (res.ok) {
    const data = await res.json();
    console.log("AVAILABLE MODELS:", data.data?.map(m => m.id));
  } else {
    console.log("Models endpoint error:", res.status, await res.text());
  }
}

testModels();
