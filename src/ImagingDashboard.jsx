import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import dicomFields from '/dicomFieldsSmall.json';
import {
  handleImportFiles
} from '/src/sharedFrontendStuff';

// for date fields, we should be able to select date range as well as indivudal database values
// we should have the option to view all images
export const ImagingDashboard = () => {
  const [groupBy, setGroupBy] = useState('studyDate');
  const [imageGroups, setImageGroups] = useState([]);
  const initialOptions = Object.keys(dicomFields).map(field => { return { label: dicomFields[field].title, value: field }; });
  const [options, setOptions] = useState([]);

  // get all columns that have more than 1 unique value
  const setUniqueColumns = async () => {
    const query = 'SELECT ' + initialOptions.map(option => {
      return `COUNT(DISTINCT ${option.value}) AS ${option.value}`
    }).join(', ') + ' FROM imaging';

    const result = await window.electronAPI.dbQuery({ query: query });
    if (!result.data) return;
    const optionsSet = result.data
      // reduce to object where all values are greater than 1
      .reduce((acc, row) => {
        for (const key in row) {
          if (row[key] > 1) {
            acc[key] = true;
          }
        }
        return acc;
      }
        , {});
    const optionsFinal = initialOptions.filter(option => optionsSet[option.value]);
    setOptions(optionsFinal);
  };

  useEffect(() => {
    setUniqueColumns();
  }, []);

  useEffect(() => {
    const f = async () => {
      const result = await window.electronAPI.dbQuery({
        query: `
      SELECT
        COUNT(${groupBy}) AS count,
        ${groupBy}
      FROM imaging
      WHERE ${groupBy} IS NOT NULL
      GROUP BY ${groupBy}
      HAVING COUNT(${groupBy}) > 0`
      });
      setImageGroups(result.data);
    };
    f();
  }, [groupBy]);

  return (
    <div>
      <h1>ImagingDashboard</h1>
      <Link to="/viewer">viewer</Link>
      <button onClick={async () => {
        const filePaths = await window.electronAPI.openFileDialog({
          filters: [{ name: 'All Files', extensions: ['*'] }],
        });
        if (!filePaths) return;
        await window.electronAPI.importFiles({ filePaths, firstPass: true });
        await setUniqueColumns();
      }}
      >
        import images...
      </button>
      {imageGroups?.length > 0 && (
        <>
          Group By: <select onChange={e => { setGroupBy(e.target.value); setImageGroups([]); }} value={groupBy}>
            {options && options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {imageGroups.map(group => <Link key={group[groupBy]} to={`/viewer?groupBy=${groupBy}&${groupBy}=${group[groupBy]}`}>{group[groupBy]} ({group.count})</Link>)}
          </div>
          {message}
        </>
      )}
    </div>
  );
};