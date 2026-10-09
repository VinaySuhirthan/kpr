import Papa from 'papaparse'

function CSVUploader({ onDataLoaded }) {
  const handleFileUpload = (event) => {
    const file = event.target.files[0]

    if (!file) return

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,

      complete: (results) => {
        console.log(
          `Loaded ${results.data.length.toLocaleString()} rows`
        )

        onDataLoaded(results.data)
      },

      error: (error) => {
        console.error('CSV error:', error)
      },
    })
  }

  return (
    <label className="upload-button">
      + Upload CSV

      <input
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        hidden
      />
    </label>
  )
}

export default CSVUploader