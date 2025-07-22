import HashMap "mo:base/HashMap";
import Principal "mo:base/Principal";
import Nat "mo:base/Nat";
import Float "mo:base/Float";
import Text "mo:base/Text";
import Iter "mo:base/Iter";
import Array "mo:base/Array";

actor {
  let DEBUG = true;

  type InterestPeriod = {
    tahunMulai : Nat;
    tahunSelesai : Nat;
    bungaTahunan : Float;
    tipe : Text;
    cicilanBulanan : Nat;
  };

  type Penalti = {
    bulan : Nat;
    persen : Float;
    jenis : Text; // "early" atau "late"
  };

  type KPRData = {
    hargaRumah : Nat;
    dp : Nat;
    tenorBulan : Nat;
    tanggalMulai : Text;
    tanggalAnalisa : Text;
    bungaSkema : [InterestPeriod];
    pelunasanEkstra : [(Nat, Nat)];
    penalti : [Penalti];
    keterangan : Text;
    hasilAI : Text;
  };

  type KPRRecord = {
    user : Principal;
    data : [KPRData];
  };

  var kprMap : HashMap.HashMap<Principal, [KPRData]> = HashMap.HashMap<Principal, [KPRData]>(10, Principal.equal, Principal.hash);
  stable var kprStore : [KPRRecord] = [];

  system func preupgrade() {
    kprStore := Iter.toArray(
      Iter.map< (Principal, [KPRData]), KPRRecord >(
        kprMap.entries(),
        func(entry : (Principal, [KPRData])) : KPRRecord {
          let (key, value) = entry;
          { user = key; data = value }
        }
      )
    );
  };

  system func postupgrade() {
    kprMap := HashMap.HashMap<Principal, [KPRData]>(10, Principal.equal, Principal.hash);
    for (record in kprStore.vals()) {
      kprMap.put(record.user, record.data);
    };
    kprStore := [];
  };

  public shared (msg) func saveKPR(data : KPRData) : async () {
    let user = if (DEBUG) Principal.fromText("aaaaa-aa") else msg.caller;
    let existing = kprMap.get(user);
    let updated = switch (existing) {
      case (?list) Array.append(list, [data]);
      case null [data];
    };
    kprMap.put(user, updated);
  };

  public shared query (msg) func getKPR() : async [KPRData] {
    let user = if (DEBUG) Principal.fromText("aaaaa-aa") else msg.caller;
    switch (kprMap.get(user)) {
      case (?list) list;
      case null []
    }
  };

  public shared query (msg) func getSimulasi(index : Nat) : async [(Nat, Float, Float, Float)] {
    let user = if (DEBUG) Principal.fromText("aaaaa-aa") else msg.caller;
    let userData = switch (kprMap.get(user)) {
      case (?list) list;
      case null return [];
    };
    if (index >= userData.size()) return [];

    let data = userData[index];
    var simulasi : [(Nat, Float, Float, Float)] = [];

    let totalBulan = data.tenorBulan;
    let bungaSkema = data.bungaSkema;
    let pelunasanEkstra = data.pelunasanEkstra;
    let daftarPenalti = data.penalti;

    let pokokAwal : Float = Float.fromInt(data.hargaRumah - data.dp);
    var sisaPokok : Float = pokokAwal;

    label sim {
      var bulan : Nat = 1;

      loop {
        if (bulan > totalBulan or sisaPokok <= 0.0) break sim;

        let tahun = (bulan - 1) / 12 + 1;

        let bungaAktif = Array.find(
          bungaSkema,
          func(p : InterestPeriod) : Bool {
            tahun >= p.tahunMulai and tahun <= p.tahunSelesai
          }
        );

        let bungaPerTahun = switch (bungaAktif) {
          case (?periode) periode.bungaTahunan;
          case null 10.0;
        };

        let cicilanAktif = switch (bungaAktif) {
          case (?periode) periode.cicilanBulanan;
          case null 0;
        };

        let bungaBulanIni : Float = sisaPokok * (bungaPerTahun / 12.0) / 100.0;
        let pokokBulanIni : Float = Float.max(0.0, Float.fromInt(cicilanAktif)) - bungaBulanIni;

        // 💰 Pelunasan Ekstra (bulan, nominal)
        let ekstraOpt = Array.find(pelunasanEkstra, func((b, _) : (Nat, Nat)) : Bool {
          b == bulan
        });

        let nominalEkstra : Nat = switch ekstraOpt {
          case (?(b, n)) n;
          case null 0;
        };

        let totalBayarPokok = pokokBulanIni + Float.fromInt(nominalEkstra);

        // ⚠️ Penalti jika ada
        let penaltiOpt = Array.find(daftarPenalti, func(p : Penalti) : Bool {
          p.bulan == bulan
        });

        let nilaiPenalti : Float = switch penaltiOpt {
          case (?p) {
            if (p.jenis == "early") {
              Float.fromInt(nominalEkstra) * p.persen / 100.0;
            } else if (p.jenis == "late") {
              sisaPokok * p.persen / 100.0;
            } else 0.0;
          };
          case null 0.0;
        };

        simulasi := Array.append(simulasi, [(bulan, totalBayarPokok, bungaBulanIni, nilaiPenalti)]);

        sisaPokok := Float.max(0.0, sisaPokok - totalBayarPokok);
        bulan += 1;
      }
    };

    return simulasi;
  };
}
