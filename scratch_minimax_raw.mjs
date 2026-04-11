async function pureTest() {
  const res = await fetch("https://api.minimaxi.chat/v1/chat/completions", {
      method: "POST",
      headers: {
          "Authorization": "Bearer sk-cp-6iv2sCSdlBr8-Pz32KSuwHVcoSvrQ1n7W8DwcVb5HVTzA72uSm-9tAonRgbtQ0EfpDt3itq9VldikdLqPIl719Z-Y0du4vsGmHKP7U64kvjaqSkA72p39bE",
          "Content-Type": "application/json"
      },
      body: JSON.stringify({
          model: "MiniMax-Text-01",
          messages: [{role: "user", content: "hello"}]
      })
  });
  console.log(res.status);
  console.log(await res.text());
}

pureTest();
