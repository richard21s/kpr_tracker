// import { AuthClient } from "@dfinity/auth-client";
import { backend } from "declarations/backend";
import { renderChart } from "./chart.js";

const OPENROUTER_API_KEY = "";
const DEBUG = true;

let identity = DEBUG
  ? { getPrincipal: () => ({ toText: () => "aaaaa-aa" }) }
  : null;

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

function readSkemaInputs() {
  const containers = document.querySelectorAll(".bunga-item");
  return Array.from(containers).map(div => ({
    tahunMulai: parseInt(div.querySelector(".start").value),
    tahunSelesai: parseInt(div.querySelector(".end").value),
    bungaTahunan: parseFloat(div.querySelector(".rate").value),
    tipe: div.querySelector(".tipe").value,
    cicilanBulanan: parseInt(div.querySelector(".cicilan").value),
  }));
}

function readPelunasanInputs() {
  const rows = document.querySelectorAll('.pelunasan-item');
  return Array.from(rows).map(div => [
    parseInt(div.querySelector('.bulan').value),
    parseInt(div.querySelector('.nominal').value)
  ]);
}

function readPenaltiInputs() {
  const rows = document.querySelectorAll('.penalti-item');
  return Array.from(rows).map(div => ({
    bulan: parseInt(div.querySelector('.bulan').value),
    persen: parseFloat(div.querySelector('.persen').value),
    jenis: div.querySelector('.jenis').value
  }));
}

function buildSkemaText(skema) {
  return skema.map(s =>
    `- Tahun ${s.tahunMulai}–${s.tahunSelesai}: ${s.bungaTahunan}% (${s.tipe}), cicilan Rp${s.cicilanBulanan}/bulan`
  ).join('\n');
}

function buildPelunasanText(list) {
  if (!list.length) return "- Tidak ada pelunasan ekstra.";
  return list.map(([bulan, nominal]) =>
    `- Bulan ${bulan}: Rp${nominal.toLocaleString("id-ID")}`
  ).join('\n');
}

function buildPenaltiText(list) {
  if (!list.length) return "- Tidak ada penalti.";
  return list.map(p =>
    `- Bulan ${p.bulan}: ${p.persen}% (${p.jenis === "early" ? "pelunasan dipercepat" : "telat bayar"})`
  ).join('\n');
}

window.addEventListener("DOMContentLoaded", async () => {
  const form = document.querySelector("form");
  const bungaContainer = document.getElementById("bungaSkema");
  const pelunasanContainer = document.getElementById("pelunasanEkstra");
  const penaltiContainer = document.getElementById("penaltiPembayaran");
  const loginStatus = document.getElementById("loginStatus");
  const greeting = document.getElementById("greeting");
  const grafikKPR = document.getElementById("grafikKPR");
  const exportCSV = document.getElementById("exportCSV");


  // Tambah Skema Bunga
  const skemaBunga = document.getElementById("addSkema");
  if (skemaBunga) {
    skemaBunga.addEventListener("click", () => {
      const div = document.createElement("div");
      div.classList.add("bunga-item");
      div.innerHTML = `
      <label>Mulai (th)</label><input type="number" class="start" required>
      <label>Selesai (th)</label><input type="number" class="end" required>
      <label>Bunga (%)</label><input type="number" class="rate" step="0.01" required>
      <label>Tipe</label>
      <select class="tipe">
        <option value="fix">Fix</option>
        <option value="floating">Floating</option>
      </select>
      <label>Cicilan Bulanan</label><input type="number" class="cicilan" required>
      <button type="button" class="hapusSkema">Hapus</button><hr/>
    `;
      div.querySelector(".hapusSkema").addEventListener("click", () => div.remove());
      bungaContainer.appendChild(div);
    });
  }

  // Tambah Pelunasan Ekstra
  document.getElementById("addPelunasan").addEventListener("click", () => {
    const div = document.createElement("div");
    div.classList.add("pelunasan-item");
    div.innerHTML = `
      <label>Bulan ke-</label><input type="number" class="bulan" required>
      <label>Nominal (Rp)</label><input type="number" class="nominal" required>
      <button type="button" class="hapusPelunasan">Hapus</button><hr/>
    `;
    div.querySelector(".hapusPelunasan").addEventListener("click", () => div.remove());
    pelunasanContainer.appendChild(div);
  });

  // Tambah Penalti
  document.getElementById("addPenalti").addEventListener("click", () => {
    const div = document.createElement("div");
    div.classList.add("penalti-item");
    div.innerHTML = `
      <label>Bulan ke-</label><input type="number" class="bulan" required>
      <label>Persen Penalti (%)</label><input type="number" class="persen" step="0.01" required>
      <label>Jenis</label>
      <select class="jenis">
        <option value="early">Early (pelunasan dipercepat)</option>
        <option value="late">Late (terlambat bayar)</option>
      </select>
      <button type="button" class="hapusPenalti">Hapus</button><hr/>
    `;
    div.querySelector(".hapusPenalti").addEventListener("click", () => div.remove());
    penaltiContainer.appendChild(div);
  });

  // Submit Form
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!identity) return alert("Harap login terlebih dahulu.");

    const bungaSkema = readSkemaInputs();
    const pelunasanEkstra = readPelunasanInputs();
    const penalti = readPenaltiInputs();

    const overlap = bungaSkema.some((s1, i) =>
      bungaSkema.some((s2, j) =>
        i !== j && !(s1.tahunSelesai < s2.tahunMulai || s1.tahunMulai > s2.tahunSelesai)
      )
    );
    if (overlap) return alert("Skema bunga tumpang tindih!");

    const data = {
      hargaRumah: parseInt(harga.value),
      dp: parseInt(dp.value),
      tenorBulan: parseInt(tenor.value) * 12,
      tanggalMulai: mulai.value,
      tanggalAnalisa: getTodayDate(),
      bungaSkema,
      pelunasanEkstra,
      penalti,
      keterangan: keterangan.value,
    };

    const prompt = `
Saya membeli rumah seharga Rp${data.hargaRumah}, dengan DP sebesar Rp${data.dp} dan tenor ${data.tenorBulan / 12} tahun.
Tanggal mulai cicilan: ${data.tanggalMulai}, dan analisis dilakukan pada tanggal ${data.tanggalAnalisa}.

📈 Skema bunga dan cicilan:
${buildSkemaText(bungaSkema)}

💰 Pelunasan ekstra yang telah dilakukan:
${buildPelunasanText(pelunasanEkstra)}

⚠️ Daftar penalti pelunasan:
${buildPenaltiText(penalti)}

Catatan tambahan: ${data.keterangan}

🧠 Saya ingin Anda sebagai konsultan keuangan dan KPR memberikan saran:
1. Apakah saya sebaiknya melakukan pelunasan dipercepat dalam beberapa bulan ke depan, atau lebih baik menyimpan uang di instrumen investasi?
2. Jika pelunasan dipercepat menguntungkan, mohon sarankan **bulan ke berapa dan nominal berapa** yang paling optimal untuk dilakukan, dengan mempertimbangkan sisa pokok, penalti pelunasan (baik yang early maupun late), dan peluang return investasi tetap sebesar 8% per tahun.
3. Jelaskan secara ringkas keuntungannya dibanding jika saya tetap membayar cicilan normal tanpa pelunasan.

Tolong jawab dalam format yang jelas dan mudah dipahami oleh non-finansial sekalipun.
`.trim();


    const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-chat-v3-0324:free",
        messages: [
          { role: "system", content: "Kamu adalah konsultan KPR dan keuangan rumah tangga..." },
          { role: "user", content: prompt }
        ]
      })
    });

    const aiData = await aiRes.json();
    const hasilAI = aiData.choices?.[0]?.message?.content || "AI tidak menjawab.";

    console.log("Hasil AI", hasilAI);
    console.log("data", data);

    // Inject dummy email jika belum login
    let email = localStorage.getItem("email");
    if (!email) {
      email = "dummy@email.com";
      localStorage.setItem("email", email);
    }

    // Kirim data ke backend
    await backend.saveKPR(email, { ...data, hasilAI });

    console.log("berhasil save KPR");
    greeting.style.display = "block";
    greeting.innerText = hasilAI;
    console.log("mau get KPR")
    const allKPR = await backend.getKPR();
    const index = allKPR.length - 1;
    let fullSimulasi = []; // data asli lengkap
    const simulasi = await backend.getSimulasi(index);
    fullSimulasi = simulasi;

    const months = simulasi.map(([b]) => `Bulan ${b}`);
    const pokok = simulasi.map(([_, p]) => Math.round(p));
    const bunga = simulasi.map(([_, __, b]) => Math.round(b));
    const penaltiVals = simulasi.map(([_, __, ___, p]) => Math.round(p));
    const ctx = grafikKPR.getContext("2d");
    if (!ctx) {
      console.error("Context canvas tidak tersedia");
      return;
    }
    renderChart(ctx, months, pokok, bunga, penaltiVals);
    function updateChartRange(startBulan, endBulan) {
      const filtered = fullSimulasi.filter(([bulan]) => bulan >= startBulan && bulan <= endBulan);
      const months = filtered.map(([b]) => `Bulan ${b}`);
      const pokok = filtered.map(([_, p]) => Math.round(p));
      const bunga = filtered.map(([_, __, b]) => Math.round(b));
      const penaltiVals = filtered.map(([_, __, ___, p]) => Math.round(p));

      const ctx = document.getElementById("grafikKPR").getContext("2d");
      renderChart(ctx, months, pokok, bunga, penaltiVals);
    }
    const sliderStart = document.getElementById("sliderStart");
    const sliderEnd = document.getElementById("sliderEnd");
    const rangeDisplay = document.getElementById("rangeDisplay");

    sliderStart.max = simulasi.length;
    sliderEnd.max = simulasi.length;
    sliderEnd.value = simulasi.length;
    rangeDisplay.textContent = `${sliderStart.value} – ${sliderEnd.value}`;

    sliderStart.addEventListener("input", () => {
      const start = parseInt(sliderStart.value);
      const end = parseInt(sliderEnd.value);
      if (start <= end) {
        updateChartRange(start, end);
        rangeDisplay.textContent = `${start} – ${end}`;
      }
    });

    sliderEnd.addEventListener("input", () => {
      const start = parseInt(sliderStart.value);
      const end = parseInt(sliderEnd.value);
      if (start <= end) {
        updateChartRange(start, end);
        rangeDisplay.textContent = `${start} – ${end}`;
      }
    });

    exportCSV.style.display = "inline-block";
    exportCSV.onclick = () => {
      const rows = ["bulan,pokok,bunga,penalti"];
      simulasi.forEach(([b, p, bungaVal, penaltiVal]) =>
        rows.push(`${b},${p.toFixed(0)},${bungaVal.toFixed(0)},${penaltiVal.toFixed(0)}`)
      );
      const blob = new Blob([rows.join("\n")], { type: "text/csv" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "simulasi_kpr.csv";
      a.click();
    };
    const downloadICS = document.getElementById("downloadICS");
    if (downloadICS) {
      downloadICS.onclick = () => {
        const pad = (num) => String(num).padStart(2, "0");

        const startDate = new Date(data.tanggalMulai);
        const events = simulasi.map(([bulan, pokok, bunga, penalti]) => {
          const eventDate = new Date(startDate);
          eventDate.setMonth(eventDate.getMonth() + Number(bulan) - 1);
          const y = eventDate.getFullYear();
          const m = pad(eventDate.getMonth() + 1);
          const d = pad(eventDate.getDate());

          const dateStr = `${y}${m}${d}`;
          const total = pokok + bunga + penalti;

          return `
BEGIN:VEVENT
SUMMARY:Cicilan KPR Bulan ${bulan}
DESCRIPTION:Pokok: Rp${pokok.toLocaleString("id-ID")}\\nBunga: Rp${bunga.toLocaleString("id-ID")}\\nPenalti: Rp${penalti.toLocaleString("id-ID")}\\nTotal: Rp${total.toLocaleString("id-ID")}
DTSTART;VALUE=DATE:${dateStr}
DTEND;VALUE=DATE:${dateStr}
END:VEVENT`;
        });
      }

      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
CALSCALE:GREGORIAN
METHOD:PUBLISH
PRODID:-//AI KPR Tracker//EN
${events.join("\n")}
END:VCALENDAR`;

      const blob = new Blob([icsContent], { type: "text/calendar" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "jadwal_kpr.ics";
      a.click();

      alert("📅 File berhasil diunduh!\nKlik dua kali untuk menambahkan ke Google Calendar atau aplikasi kalender lainnya.");
    };
  });
  const historyButton = document.getElementById("lihatHistoriBtn");
  if (historyButton) {
    // Lihat histori
    historyButton.addEventListener("click", async () => {
      const histori = await backend.getKPR();
      let output = "";

      histori.forEach((entry, index) => {
        const harga = entry.hargaRumah ? Number(entry.hargaRumah).toLocaleString("id-ID") : "-";
        const tenor = entry.tenorBulan ? Number(entry.tenorBulan) / 12 : "-";
        const mulai = entry.tanggalMulai || "-";
        const analisa = entry.tanggalAnalisa || "-";
        const keterangan = entry.keterangan?.trim() || "-";
        const hasilAI = entry.hasilAI || "-";

        const skema = buildSkemaText(entry.bungaSkema);
        const pelunasan = buildPelunasanText(entry.pelunasanEkstra);
        const penalti = buildPenaltiText(entry.penalti || []);

        output += `#${index + 1} - Harga: Rp${harga}\n`;
        output += `Tenor: ${tenor} tahun, Mulai: ${mulai}, Analisa: ${analisa}\n`;
        output += `Keterangan: ${keterangan}\n`;
        output += `📊 Skema Cicilan:\n${skema}\n`;
        output += `💵 Pelunasan Ekstra:\n${pelunasan}\n`;
        output += `⚠️ Penalti:\n${penalti}\n`;
        output += `🧠 Hasil AI:\n${hasilAI}\n\n`;
      });

      document.getElementById("historiOutput").innerText = output || "Belum ada data.";
    });
  }
});
