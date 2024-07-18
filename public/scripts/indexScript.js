document.getElementById("add-course-btn").addEventListener("click", function () {
    document.getElementById("course-form").style.display = "block";
});

document.getElementById("cancel-course-btn").addEventListener("click", function () {
    document.getElementById("course-form").reset();
    document.getElementById("course-form").style.display = "none";
});

document.getElementById("course-form").addEventListener("submit", function (event) {
    event.preventDefault();

    const courseTitle = document.getElementById("course-title").value;
    const sanitizedTitle = courseTitle.replace(/\s+/g, '-'); // Replace spaces with hyphens
    const instructor = document.getElementById("instructor").value;
    const courseDuration = document.getElementById("course-duration").value;
    const courseDescription = document.getElementById("course-description").value;

    const courseItem = document.createElement("article");
    courseItem.classList.add("course-item");

    courseItem.innerHTML = `
        <h2>${courseTitle}</h2>
        <p>Instructor: ${instructor}</p>
        <p>Duration: ${courseDuration}</p>
        <p>Description: ${courseDescription}</p>
        <ul class="units" id="units-${sanitizedTitle}">
          <!-- Chapters will be dynamically added here -->
        </ul>
        <section class="pdf-upload">
          <h3>Upload PDF</h3>
          <input type="file" class="pdf-file" accept=".pdf">
          <button class="green-btn upload-pdf-btn">Upload PDF</button>
        </section>
        <button class="remove-btn">Remove Course</button>
    `;

    document.getElementById("course-list").appendChild(courseItem);

    document.getElementById("course-form").reset();
    document.getElementById("course-form").style.display = "none";

    courseItem.querySelector(".upload-pdf-btn").addEventListener("click", function (event) {
        event.preventDefault();
        const fileInput = courseItem.querySelector(".pdf-file");
        const file = fileInput.files[0];
        if (file) {
            const formData = new FormData();
            formData.append('pdfFile', file);

            fetch('/uploadPdf', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (!data.fileName) {
                    throw new Error("Invalid response from server");
                }
                const unitsList = courseItem.querySelector(`#units-${sanitizedTitle}`);
                const unitItem = document.createElement("li");
                unitItem.innerHTML = `<a href="#" id="pdf-${encodeURIComponent(data.fileName)}">${data.fileName}</a> <button class="remove-chapter-btn">Remove</button>`;
                unitsList.appendChild(unitItem);
                fileInput.value = ""; // Reset the file input

                unitItem.querySelector(".remove-chapter-btn").addEventListener("click", function () {
                    unitsList.removeChild(unitItem);
                });

                unitItem.querySelector(`a`).addEventListener("click", function (event) {
                    event.preventDefault();
                    const pdfName = decodeURIComponent(this.id.replace("pdf-", ""));
                    window.open(`/convertPdf?pdfName=${encodeURIComponent(pdfName)}`, "_blank"); // Opens in a new tab/window
                  });
                  
            })
            .catch(error => {
                console.error("Error uploading PDF:", error);
            });
        }
    });

    courseItem.querySelector(".remove-btn").addEventListener("click", function () {
        document.getElementById("course-list").removeChild(courseItem);
    });
});
