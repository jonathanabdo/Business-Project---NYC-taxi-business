"""Build monthly, annual, pickup and drop-off summaries from NYC TLC Parquet.
Run: python src/download_data.py && python src/analyze.py
All amounts aggregated in integer cents; never average monthly averages.
"""
from pathlib import Path
import argparse, calendar, hashlib, json, shutil
import numpy as np
import pandas as pd
ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'data'; DOCS=ROOT/'docs'; OUT=DATA/'summary'

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--start',default='2020-01');parser.add_argument('--end',default='2026-08');args=parser.parse_args()
    months=list(pd.period_range(args.start,args.end,freq='M').astype(str))
    OUT.mkdir(parents=True,exist_ok=True);DOCS.mkdir(exist_ok=True)
    zones=pd.read_csv(DATA/'raw/taxi_zone_lookup.csv').set_index('LocationID')
    pickup=[];dropoff=[];audit=[];source_columns=set();daily=[]
    for month in months:
        path=DATA/'raw'/f'green_tripdata_{month}.parquet'
        if not path.exists():raise FileNotFoundError(f'{path.name} missing. Run download_data.py first.')
        df=pd.read_parquet(path);source_columns.update(df.columns)
        dates=pd.to_datetime(df.lpep_pickup_datetime,errors='coerce')
        reason=np.select([dates.dt.strftime('%Y-%m').ne(month),~df.payment_type.isin([1,2]),~(df.fare_amount.gt(0)&df.total_amount.gt(0))],['Pickup outside source month or missing','Payment is not card or cash','Nonpositive or missing fare / total'],default='Included')
        counts=pd.Series(reason).value_counts().to_dict()
        audit.append(dict(month=month,raw_rows=len(df),included_rows=counts.get('Included',0),excluded_rows=len(df)-counts.get('Included',0),source_columns=len(df.columns),exclusion_counts=counts,sha256=hashlib.sha256(path.read_bytes()).hexdigest(),source_url=f'https://d37ci6vzurychx.cloudfront.net/trip-data/{path.name}'))
        sel=df.loc[reason=='Included'].copy()
        for col,short in [('fare_amount','fare'),('total_amount','charges'),('tip_amount','tips')]:sel[short+'_cents']=(sel[col].fillna(0)*100).round().astype('int64')
        sel['date']=dates.loc[sel.index].dt.strftime('%Y-%m-%d')
        for location, dest in [('PULocationID',pickup),('DOLocationID',dropoff)]:
            sel['zone_id']=pd.to_numeric(sel[location],errors='coerce').fillna(-1).astype(int)
            g=sel.groupby('zone_id').agg(trips=('fare_cents','size'),fare_cents=('fare_cents','sum'),charges_cents=('charges_cents','sum'),tips_cents=('tips_cents','sum')).reset_index()
            g['month']=month;g['borough']=g.zone_id.map(zones.Borough).fillna('Unknown');g['zone']=g.zone_id.map(zones.Zone).fillna('Unknown')
            dest.append(g)
        d=sel.groupby('date').agg(trips=('fare_cents','size'),fare_cents=('fare_cents','sum'),charges_cents=('charges_cents','sum'),tips_cents=('tips_cents','sum')).reset_index();daily.append(d)
        print(month,len(df),len(sel),flush=True)
    pu=pd.concat(pickup,ignore_index=True);do=pd.concat(dropoff,ignore_index=True)
    keys=['trips','fare_cents','charges_cents','tips_cents']
    monthly=pu.groupby('month')[keys].sum().reset_index()
    monthly['year']=monthly.month.str[:4].astype(int);monthly['calendar_days']=monthly.month.map(lambda x:calendar.monthrange(int(x[:4]),int(x[-2:]))[1])
    annual=monthly.groupby('year')[keys+['calendar_days']].sum().reset_index();annual['months_available']=monthly.groupby('year').size().values
    def dollar_table(frame):
        frame=frame.copy()
        for x in ['fare','charges','tips']:frame[x+'_usd']=frame.pop(x+'_cents')/100
        frame['average_fare_usd']=(frame.fare_usd/frame.trips).round(4)
        if 'calendar_days' in frame:frame['fare_per_day_usd']=(frame.fare_usd/frame.calendar_days).round(2)
        return frame
    for frame,name in [(monthly,'monthly_summary'),(annual,'annual_summary'),(pu,'monthly_pickup_zones'),(do,'monthly_dropoff_zones'),(pd.concat(daily),'daily_summary')]:dollar_table(frame).to_csv(OUT/(name+'.csv'),index=False)
    meta=dict(coverage_start=args.start+'-01',coverage_end=str(pd.Period(args.end).end_time.date()),raw_rows=sum(x['raw_rows'] for x in audit),included_rows=sum(x['included_rows'] for x in audit),excluded_rows=sum(x['excluded_rows'] for x in audit),source_columns=len(source_columns),monthly_files=len(months),months=months,years=sorted(set(int(m[:4]) for m in months)),fare_cents=int(monthly.fare_cents.sum()),charges_cents=int(monthly.charges_cents.sum()),audit_by_month=audit,notes='Pickup month matches source file; card/cash payment; positive fare and total. No deduplication or upper-value trimming. Nominal USD. 2026 partial.')
    (OUT/'data_quality.json').write_text(json.dumps(meta,indent=2))
    pd.DataFrame(audit).drop(columns=['exclusion_counts']).to_csv(OUT/'source_manifest.csv',index=False)
    payload=dict(meta=meta,pickup=pu.to_dict('records'),dropoff=do.to_dict('records'))
    (DOCS/'data.js').write_text('window.TAXI_DATA = '+json.dumps(payload,separators=(',',':'))+';\n')
    exports=DOCS/'exports';exports.mkdir(exist_ok=True)
    for name in ['monthly_summary.csv','annual_summary.csv','source_manifest.csv','data_quality.json']:shutil.copyfile(OUT/name,exports/name)
    assert int(pu.trips.sum())==int(do.trips.sum())==meta['included_rows']
    for k in keys:assert int(pu[k].sum())==int(do[k].sum())==int(monthly[k].sum())
    print(dollar_table(annual).to_string(index=False));print(json.dumps({k:v for k,v in meta.items() if k not in ['audit_by_month','months']},indent=2))
if __name__=='__main__':main()
