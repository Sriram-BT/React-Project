import React, { useEffect, useState, useCallback } from "react";
import DataSource from "devextreme/data/data_source";
import Chart, {
  ArgumentAxis,
  Series,
  ZoomAndPan,
  Legend,
  ScrollBar,
  Font,
  LoadingIndicator,
  Tooltip,
} from "devextreme-react/chart";
let packetsLock = 0;

const chartDataSource = new DataSource({
  store: [],
  sort: "date",
  paginate: false,
});

function App() {
  const [visualRange, setVisualRange] = useState({
    startValue: new Date("2009-01-01T00:01:00.000000Z"),
    endValue: new Date("2009-01-01T00:02:10.000000Z"),
  });
  const [wholeRange, setWholeRange] = useState({
    startValue: new Date("2008-12-31T23:58:25.566Z"),
    endValue: new Date("2009-01-01T00:05:10.000000Z"),
  });

  let getDataFrame = async (ajaxArgs) => {
    let query = `SELECT pickup_datetime ,trip_distance  FROM trips WHERE pickup_datetime BETWEEN '${ajaxArgs.startVisible}' and '${ajaxArgs.endVisible}'`;
    const response = await fetch(
      `https://demo.questdb.io/exec?query=${encodeURIComponent(query)}`
    );
    const json = await response.json();
    let zoomingData = [];
    json.dataset.map((data) => {
      const date = data[0];
      let value = { X: new Date(date), Y: data[1] };
      zoomingData = [...zoomingData, value];
      console.log(value);
    });
    return zoomingData;
  };

  const uploadDataByVisualRange = useCallback(
    (e) => {
      const dataSource = e.component.getDataSource();
      const storage = dataSource.items();

      const ajaxArgs = {
        startVisible: getDateString(visualRange.startValue),
        endVisible: getDateString(visualRange.endValue),
        startBound: getDateString(storage.length ? storage[0].X : null),
        endBound: getDateString(
          storage.length ? storage[storage.length - 1].X : null
        ),
      };
      if (
        ajaxArgs.startVisible !== ajaxArgs.startBound &&
        ajaxArgs.endVisible !== ajaxArgs.endBound &&
        !packetsLock
      ) {
        packetsLock += 1;
        e.component.showLoadingIndicator();
        getDataFrame(ajaxArgs)
          .then((dataFrame) => {
            packetsLock -= 1;
            const componentStorage = dataSource.store();
            dataFrame.forEach((item) => {
              componentStorage.insert(item);
            });
            dataSource.reload();
            console.log(dataFrame);
          })
          .catch((error) => {
            packetsLock -= 1;
            console.log("error", error);
            dataSource.reload();
          });
      }
    },
    [visualRange]
  );
  const onVisualRangeChanged = useCallback(
    (e) => {
      const items = e.component.getDataSource().items();

      const currentStart = e.value.startValue;
      const currentEnd = e.value.endValue;
      let val = Math.abs(currentStart - currentEnd);

      if (
        (!items.length ||
          items[0].X - visualRange.startValue.getTime() >= val / 4 ||
          visualRange.endValue.getTime() - items[items.length - 1].X >=
            val / 4) &&
        (!items.length || items[0].X <= currentStart.getTime())
      ) {
        uploadDataByVisualRange(e);
      }
    },
    [visualRange, uploadDataByVisualRange]
  );
  const handleChange = useCallback(
    (e) => {
      if (e.fullName === "argumentAxis.visualRange") {
        const stateStart = visualRange.startValue;
        const stateEnd = visualRange.endValue;
        const currentStart = e.value.startValue;
        const currentEnd = e.value.endValue;
        const wholeStart = wholeRange.startValue;
        const wholeEnd = wholeRange.endValue;

        if (
          stateStart.valueOf() !== currentStart.valueOf() ||
          stateEnd.valueOf() !== currentEnd.valueOf()
        ) {
          setVisualRange({
            startValue: new Date(e.value.startValue),
            endValue: new Date(e.value.endValue),
          });
        }
        if (
          wholeStart.getTime() >= currentStart.getTime() ||
          wholeEnd.getTime() <= currentEnd.getTime()
        ) {
          let currentStart1 =
            stateStart.getTime() - (stateEnd - stateStart) * 60;

          let currentEnd1 = stateEnd.getTime() + (stateEnd - stateStart) * 60;
          setWholeRange({
            startValue: new Date(currentStart1),
            endValue: new Date(currentEnd1),
          });
        }
        onVisualRangeChanged(e);
      }
    },
    [setVisualRange, visualRange, onVisualRangeChanged, wholeRange]
  );
  function getDateString(dateTime) {
    return dateTime ? dateTime.toISOString() : "";
  }
  function formatDate(date) {
    if (!date) return "";

    const formattedDate = new Date(date)
      .toISOString()
      .replace("T", " ")
      .replace(/\.\d+Z$/, "");

    return formattedDate;
  }

  return (
    <Chart
      id="chart"
      palette="Harmony Light"
      dataSource={chartDataSource}
      onOptionChanged={handleChange}
    >
      <Series argumentField="X" valueField="Y" />
      <ArgumentAxis
        argumentType="datetime"
        visualRange={visualRange}
        wholeRange={wholeRange}
        visualRangeUpdateMode="keep"
      />
      <ScrollBar visible={true} />
      <LoadingIndicator backgroundColor="none">
        <Font size={14} />
      </LoadingIndicator>
      <ZoomAndPan argumentAxis="both" />
      <Legend visible={true} />
      <Tooltip
        enabled={true}
        contentRender={({ argumentText, valueText }) => (
          <div>
            <div>Pickup Date&time: {formatDate(argumentText)}</div>
            <div>Trip distance : {valueText} km</div>
          </div>
        )}
      />{" "}
    </Chart>
  );
}

export default App;
