\# SafeHaven Technical Documentation



\## 1. Overview and Trust Layers



\### Core Function



SafeHaven is an independent Android application distribution platform focused on transparency, source code visibility, and clear software metadata. Instead of asking users to blindly trust the platform or the applications within it, SafeHaven explicitly documents where an application comes from, whether its developer source has been cryptographically verified, and how it performs against automated security scans.



\### Ecosystem Components



The infrastructure relies on three decoupled components to maintain speed, scale, and separation of concerns:



\* \*\*Routing Backend:\*\* A Cloudflare Workers application that manages API routing, processes developer uploads, orchestrates security scans, and generates the public catalog index.

\* \*\*Storage Layer:\*\* An S3-compatible object storage server that hosts the public JSON index document, staging uploads, and production binary files.

\* \*\*Scanner Service:\*\* A standalone Python application running as background services on a Linux server to pull pending files, extract metadata, and run signature or threat validations.



\### The Five Trust Metrics



The client interface displays five explicit trust metrics for every application profile to give users visibility into package security:



\* \*\*Source Linked:\*\* The listing contains a verified link to a public source repository containing the code for the package.

\* \*\*Verified Source:\*\* The developer has proven direct administrative control over the linked repository by completing a cryptographic hand-shake file verification during setup.

\* \*\*Unverified Listings:\*\* Applications suggested or imported by the community that have not been explicitly claimed by their original authors are clearly marked as unverified to maximize transparency.

\* \*\*APK Scanning:\*\* Every single compiled application file must pass through an automated check pipeline before becoming searchable or downloadable in the public repository.

\* \*\*Automated Security Rechecks:\*\* Packages are regularly rescanned post-release to ensure metadata remains fresh and new signatures can be verified against malicious zero-day discoveries.



\---



\## 2. App Curation and Ingestion



SafeHaven populates its catalog using four distinct validation channels to balance verified developer support with open-source discovery:



\### Developer Submissions



Verified application authors register and manage profiles directly using the web management portal. From this dashboard, developers retain complete control over their listing text, promotional assets, tags, and version lifecycle releases.



\### Community Contributions



General users can submit public repository links for open-source applications they wish to see on the platform. These entries automatically pass into the validation queue but are rigidly tagged with an "Unverified Developer" label in the client app, letting mobile users know the profile was built by the community rather than the original creator.



\### Automated GitHub Scraping



The backend utilizes automated scanning routines that regularly filter global software tracking pages for the top 50 trending open-source Android projects. If a package does not match an existing database signature, it is automatically fetched, parsed, and routed directly into the security validation queue.



\### F-Droid Repository Sync



The server queries the official F-Droid repository index on a structured schedule. The ingestion engine explicitly filters for application packages that have been updated or created within a rolling 12-month window. If an application meets this criteria and does not conflict with an existing verified developer signature in the database, it is safely pulled into the submission pipeline.



\---



\## 3. Submission Lifecycle and Access Tiers



\### Lifecycle States



Every application update must pass through a strict sequence of transactional gates before reaching production mirrors:



```text

pending\_upload -> pending\_scan -> scanning -> pending\_review -> live

&#x20;                                                            -> rejected



```



\* \*\*`pending\_upload`:\*\* The database record is created, and the system waits for the file to arrive. This state locks version parameters and names before file storage interactions start.

\* \*\*`pending\_scan`:\*\* The application binary has successfully landed in temporary staging storage and is appended to the scanner queue. This stage completely decouples network upload times from processing cycles.

\* \*\*`scanning`:\*\* The background service pulls the specific binary block to compute checksums and run behavioral engine analysis. The file is marked as scanning so separate worker instances do not pick up duplicate jobs.

\* \*\*`pending\_review`:\*\* The application successfully clears all automated validation rules and waits for a manual check or a background timeout script to execute. This step acts as a safety buffer period.

\* \*\*`live`:\*\* The application is moved to production storage, and the global file index updates. It is now immediately visible to all connected devices.

\* \*\*`rejected`:\*\* The application triggered a known threat signature, mismatched developer credentials, or failed structural validation. The package is blocked and cannot enter the catalog.



\### Staging and Storage Allocation



To maximize security, developers never upload files directly to the database or the live production directory. Instead, the backend generates an AWS Signature Version 4 presigned PUT URL that expires exactly 15 minutes after generation. The developer pushes the binary to this isolated staging directory. Once the file is verified and approved, the server uses a fast bucket-level copy command to promote the asset into production space.



\### Automated Approvals



A scheduled cron service runs inside the background architecture to look for items flagged as `pending\_review`. If an item remains in the review state past a set duration without generating errors, the task bypasses manual backlogs and promotes the clean asset to the live public catalog automatically.



\### Access Control Tiers



The HTTP routing architecture protects endpoint logic by separating API paths into six explicit authority groups:



\* \*\*Public:\*\* Open endpoints requiring no credential tokens (e.g., pulling the public index or looking up a public catalog entry).

\* \*\*User:\*\* Authenticated accounts capable of viewing standard account configurations or historical actions.

\* \*\*Developer:\*\* Authenticated accounts flagged with active developer privileges, allowing package registration and listing creation.

\* \*\*Owner:\*\* The specific developer account matching the unique identification field of the registered application, granting release controls.

\* \*\*Admin:\*\* Administrative accounts with complete access to overwrite status indicators, manually adjust trust flags, or force approvals.

\* \*\*Scanner Secret:\*\* Validation tokens matching a shared background secret header, allowing the VPS scanner to fetch files and commit scan reports.



\---



\## 4. Client Sync and Patch Protocol



\### Dynamic Delta Queries



To minimize mobile data overhead and prevent slow load speeds, the client avoids downloading monolithic catalog documents when checking for updates. Instead, the sync engine queries the tracking endpoint by passing the device's local index timestamp: `/store/sync?since=1715846400`. The server evaluates this timestamp against a dynamic rolling modification window to determine if the client requires a comprehensive index fetch or an isolated patch set.



\### Data Payload Operations



When processing incremental modifications, the server returns a lightweight tracking document containing two array sets: `updates` and `removes`. The client application processes these targets directly inside local memory blocks:



```json

{

&#x20; "action": "patch",

&#x20; "timestamp": 1715850000,

&#x20; "removes": \[

&#x20;   "com.example.oldapp"

&#x20; ],

&#x20; "updates": \[

&#x20;   {

&#x20;     "packageName": "com.example.updatedapp",

&#x20;     "name": "Updated App Name",

&#x20;     "versionCode": 42

&#x20;   }

&#x20; ]

}



```



The device filters the local database to instantly drop package entries matching strings found inside the `removes` block. It then iterates across the items inside the `updates` array, performing an upsert operation that modifies existing data models or appends completely new listings to the UI list.



\### Cache Recovery Controls



If local storage values become unreadable or suffer file corruption on disk, client-side decoding blocks intercept the resulting system exceptions. Instead of crashing, the initialization flow catches the error, clears the invalid local storage path entirely, and forces a full refresh call that fetches a clean copy of the complete repository index from scratch.



\---



\## 5. Scanner Architecture and Modular Design



\### System Topology



The scanning deployment on the Linux VPS operates through three separated systemd background services to guarantee that tasks run independently without blocking one another:



\* \*\*`safehaven-scanner`:\*\* The main engine running on port 8080 that polls the server for jobs, fetches staging binaries, extracts file metadata, and submits results.

\* \*\*`safehaven-hash`:\*\* A local intelligence database service running on port 8081 that stores known malicious checksum structures.

\* \*\*`safehaven-defs`:\*\* An automated update utility that tracks definition updates every 24 hours, pulling fresh signatures and restarting the scanner smoothly when modifications land.



\### FOSS Defaults



The scanning infrastructure is designed to remain completely open-source and modular. It does not force hard dependencies on closed-source analysis layers. If a community fork scrubs the proprietary public keys or completely deletes the optionally compiled `.so` engine libraries, the scanner continues running without errors. It automatically scales back its functionality to act as a robust hash and certificate extraction check engine.



\### Local Threat Database



To preserve client environment privacy and cut down network dependencies, the `safehaven-hash` service pulls recent malware definitions from open threat feeds every two hours. It writes these rules into an isolated, local SQLite database file. The scanner processes all signature evaluations against this local database resource, completely removing the need to leak file hashes to external third-party lookup APIs.



\### VX-TITANIUM Engine Plugins



When the optional `libcolourswift\_av.so` and machine learning definition packages are detected in the file directory, the scanner automatically mounts the full VX-TITANIUM validation engine. Every incoming package then undergoes comprehensive byte-structure parsing, YARA pattern verification, and automated classifier evaluations to detect obfuscated malicious payloads before they can infect user hardware.



\---



\## 6. Ranking Logic and Storage Layout



\### Top Charts Ranking



To maintain strict transparency, SafeHaven removes developer verification bias from its discovery algorithms. The platform's Top Charts section is calculated on-device by the client application.



Instead of a raw mathematical average, the ranking algorithm evaluates every application by balancing its average rating score against its total review count, while adjusting for a baseline minimum review threshold and the global average rating of the entire catalog.



This approach ensures a fair ranking system by preventing two common structural issues:



\* An application with a single 5-star review cannot instantly jump to the top of the charts over heavily tested software.

\* Massive, established applications cannot permanently lock down top positions using historical, stagnant review totals.



This local balancing system allows newly launched applications with a small but highly rated user base to climb the charts organically based entirely on pure metrics.

\### Object Storage Schema



The directory design within the S3 storage bucket keeps public document access completely separated from staging validation environments:



```text

index.json

apps/

&#x20; └── com.example.app/

&#x20;       └── 104/

&#x20;             └── app.apk

staging/

&#x20; └── com.example.app/

&#x20;       └── 105/

&#x20;             └── app.apk



```



\* \*\*`index.json`:\*\* The global, public-facing index file that contains the complete catalog, available categories, and version metadata.

\* \*\*`apps/`:\*\* The production directory path, organized cleanly by package name strings and corresponding version code integers, containing only approved live binaries.

\* \*\*`staging/`:\*\* A secured directory block containing temporary pre-review uploads that are hidden from the public index until they successfully clear the scanner service.

