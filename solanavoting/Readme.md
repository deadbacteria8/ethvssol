README IS OLD!!
!!!

NPM install

solana-keygen new
Detta skapar wallet key.

solana address
ger din pubkey

solana config 
så ser du var din private key är. 

anchor build

anchor keys list 
använd nyckeln för declare_id!("nyckel"); i programs/voting_program/src/lib.rs. Detta är vart kontrakten skrivs och själva "programmet". Uppdatera själva Anchor.toml voting_program = "key" till den nyckeln också.

solana-test-validator
för att köra igång blockkedjan. denna måste vara igång i egen terminal.

pkill -9 solana-test-validator
för att döda validator

anchor deploy
om du ska lägga till nya contract på blockkedjan. det behövs om du inte tidigare gjort det.

solana program show --programs
för att se körande program.

Det finns något sett att köra tester via anchor. Om du vill göra det ,Kolla Anchor.toml och ändra det som behövs. Jag gör inte det. Därav så behöver jag setta ANCHOR_WALLET och ANCHOR_PROVIDER_URL som env variabler för att köra test_suite.ts.

npm test
testar egentligen inget. jag fick lite problem med typescript och chai att fungera med varandra. det ända testerna gör är att skapa konton och skapa en röst. den loggar vote-count och user-has-voted.
