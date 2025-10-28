import React, { useContext } from 'react';
import { SheetContext } from './SheetContext';
import { useRouter } from 'next/router';

const SheetSelectionPage: React.FC = () => {
  const { sheetNames, setSelectedSheet } = useContext(SheetContext);
  const router = useRouter();

  const handleSheetSelect = (sheetName: string) => {
    setSelectedSheet(sheetName);
    router.push('/form'); // Navigate to the questionnaire page
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Select a Sheet</h1>
      <ul className="space-y-4">
        {sheetNames.map((sheetName, index) => (
          <li key={index}>
            <button
              onClick={() => handleSheetSelect(sheetName)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              {sheetName}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SheetSelectionPage;