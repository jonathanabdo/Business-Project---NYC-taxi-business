"""Download official green taxi monthly Parquet files; safe to rerun.
Default coverage: Jan 2020–Aug 2026 (80 monthly files).
python src/download_data.py --start 2020-01 --end 2026-08
"""
from pathlib import Path
import argparse, concurrent.futures, urllib.request, time
ROOT=Path(__file__).resolve().parents[1]
BASE='https://d37ci6vzurychx.cloudfront.net'

def download(url, target):
    if target.exists() and target.stat().st_size>100: return target.name+' cached'
    for attempt in range(3):
        try:
            with urllib.request.urlopen(url,timeout=90) as r:
                data=r.read()
            if target.suffix=='.parquet' and (data[:4]!=b'PAR1' or data[-4:]!=b'PAR1'):
                raise ValueError('Invalid Parquet response')
            tmp=target.with_suffix(target.suffix+'.tmp');tmp.write_bytes(data);tmp.replace(target)
            return target.name+' downloaded'
        except Exception:
            if attempt==2:raise
            time.sleep(1+attempt)

def main():
    p=argparse.ArgumentParser();p.add_argument('--start',default='2020-01');p.add_argument('--end',default='2026-08');a=p.parse_args()
    import pandas as pd
    out=ROOT/'data/raw';out.mkdir(parents=True,exist_ok=True)
    months=pd.period_range(a.start,a.end,freq='M').astype(str)
    jobs=[(f'{BASE}/trip-data/green_tripdata_{m}.parquet',out/f'green_tripdata_{m}.parquet') for m in months]
    jobs.append((f'{BASE}/misc/taxi_zone_lookup.csv',out/'taxi_zone_lookup.csv'))
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        for result in pool.map(lambda x:download(*x),jobs):print(result,flush=True)
if __name__=='__main__':main()
