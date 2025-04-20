#### 1. Installera Npm paket

```
npm install
```

---

#### 2. Skapa solana wallet

```
solana-keygen
```

Du kan hämta pub nyckeln med

```
solana address
```

Privata nyckeln ligger under

```
~/.config/solana/id.json
```

---

#### 3. Bygg Anchor projektet

```
anchor build
```

---

#### 4. Sätt anchor program id

Hämta nyckel med

```
anchor keys list
```

Sätt denna nyckel i

```
programs/voting_program/src/lib.rs #declare_id!("nyckel")
Anchor.toml #voting_program = "key"
```

---

#### 4.5 Ta bort WASM och sätt specifika paket (behövs antagligen inte)

Ta bort wasm i root Cargo.toml's member list 

lägg till i solanas Cargo.toml

```
[dependencies]
proc-macro2 = "1.0.56"
anchor-syn = "0.30.1"
syn = "2.0.46"

[package.metadata.solana]
address-sanitizer = false
leak-sanitizer = false
max-stack-frame-size = 65536
```

---

#### 5. Start Solana kedja i annan terminal

Starta

```
solana-test-validator
```

Sen när man ska stänga av

```
pkill -9 solana-test-validator
```

---

#### 6. Deploya anchor programmet

Behövs om man inte gjort de tidigare

```
anchor deploy
```

---

#### 7. (Optional) Kolla de program Solana kör

```
solana program show --programs
```

---

#### 8. Sätta Env variabler i Terminal

Sätt den privata nyckeln som ANCHOR_WALLET

```
export ANCHOR_WALLET=~/.config/solana/id.json
```

ANCHOR_PROVIDER_URL?