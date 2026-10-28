# NYC Fare — 2020–2026
Python analysis of official NYC green taxi trip records, January 2020–August 2026.

## What is included
- 80 monthly files analyzed: 6,019,100 original records, 4,757,732 included trips.
- $75,966,369.42 recorded base fares; $97,693,876.26 passenger charges.
- Independent filters for summary cards, monthly chart, annual comparison, pickup zones, drop-off zones and monthly table.
- Annual comparison supports all available months or January–August in every year.
- 2026 is partial. Prior years contain all 12 months. All amounts are nominal USD.

## Open the dashboard
Open docs/index.html with the other files kept alongside it. No installation is needed to view it.
Publish the docs folder with GitHub Pages: main branch, /docs folder.
See UPDATE_GITHUB.txt for exact upload steps.

## Reproduce the analysis
Python 3.11+ recommended. In Terminal, open this project folder and run:

```bash
python3 -m pip install -r requirements.txt
python3 src/download_data.py
python3 src/analyze.py
```

The compact upload package includes all calculated summaries and source links, rather than the large raw trip files. The download script retrieves the 80 official Parquet files into data/raw. The analysis processes one month at a time. It does not use the older project's data/csv files or prepared_trips.csv.gz.

For another period, pass the same --start YYYY-MM --end YYYY-MM arguments to both scripts. The dashboard's special 2026/January–August labels and comparison cutoff must also be reviewed when extending beyond this snapshot.

## Files
- docs/index.html: page content; docs/style.css: design; docs/app.js: independent filters and charts.
- docs/data.js: generated summaries in integer cents, never edit numbers manually.
- data/summary/monthly_summary.csv: one row per month (80 rows).
- data/summary/annual_summary.csv: one row per year (7 rows).
- data/summary/monthly_pickup_zones.csv and monthly_dropoff_zones.csv: month/zone summaries.
- data/summary/daily_summary.csv: daily summary data.
- data/summary/source_manifest.csv: source URLs, hashes and counts.
- data/summary/data_quality.json: exclusion counts for every month.

## Inclusion rules
Pickup month must match its source file; payment type is card (1) or cash (2); fare_amount and total_amount must both be positive. Rules apply equally across years. No deduplication or high-value trimming; source data have no unique trip ID. Missing/non-card/cash payments and nonpositive records are excluded. Counts represent trip records, not unique riders.

Base fare is fare_amount. Passenger charges use total_amount; cash tips are not recorded. Neither is profit or driver take-home pay. Average fare = total fares / total included trips. Fares per day = fares / calendar days in the covered months. Pickup and drop-off charts group the same trips from different perspectives: do not sum both charts.

## Sources
- https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page
- https://www.nyc.gov/assets/tlc/downloads/pdf/data_dictionary_trip_records_green.pdf
- https://d37ci6vzurychx.cloudfront.net/misc/taxi_zone_lookup.csv
Individual monthly source URLs and SHA-256 hashes are in the manifest. Historical files retrieved October 27, 2026; the original 2026 snapshot is retained.

This is a learning portfolio developed with AI assistance. Review the calculations and code before describing your personal contribution in applications.
