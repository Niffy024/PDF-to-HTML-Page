// URL of the PDF document
const url = 'Chapter1-Introduction.pdf';// change it to the path of the pdf you wanna convert to html

// Load the PDF document
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js';

const loadingTask = pdfjsLib.getDocument(url);
loadingTask.promise.then(pdf => {
    console.log('PDF loaded');

    // Fetch the first page
    const pageNumber = 1;
    pdf.getPage(pageNumber).then(page => {
        console.log('Page loaded');

        const scale = 1.5;
        const viewport = page.getViewport({ scale: scale });

        // Prepare canvas using PDF page dimensions
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Append canvas to the PDF container
        document.getElementById('pdf-container').appendChild(canvas);

        // Render PDF page into canvas context
        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };
        page.render(renderContext).promise.then(() => {
            console.log('Page rendered');
        });
    });
}, reason => {
    console.error(reason);
});
//const url = 'path/to/your/document.pdf';
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js';

pdfjsLib.getDocument(url).promise.then(pdf => {
    console.log('PDF loaded');

    const container = document.getElementById('pdf-container');

    // Loop through each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        pdf.getPage(pageNum).then(page => {
            const scale = 1.5;
            const viewport = page.getViewport({ scale: scale });

            // Create canvas element
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            // Append canvas to the container
            container.appendChild(canvas);

            // Render PDF page into canvas context
            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };
            page.render(renderContext);
        });
    }
});
