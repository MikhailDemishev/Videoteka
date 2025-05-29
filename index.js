const server = 'https://sb-film.skillbox.cc/films';
const email = 'mikhail.demishev.88@gmail.com';
const myForm = document.querySelector('#film-form');
const delAllBtn = document.querySelector('.btn--delete-all');

const validate = new JustValidate('#film-form', {
  validateBeforeSubmitting: true,
  errorLabelStyle: {},
  errorLabelCssClass: 'custom-input__error',

});
const filmChoices = document.querySelector('#sortby');

const filterInputs = document.querySelector('.search__bar').querySelectorAll('.custom-input__field');

const sortBtns = document.querySelectorAll('.output__table-header-cell-sort-up, .output__table-header-cell-sort-down');




const choices = new Choices(filmChoices, {
  searchEnabled: false,
  shouldSortItems: true,
  classNames: {
    containerInner: 'choices-select__inner',
    highlightedState: 'choices-select__highlight',

  }
});

filterInputs.forEach(filterInput => {
  filterInput.addEventListener('input', function (e) {
    filterItems(e.target);
  });
  filterInput.addEventListener('blur', function (e) {
    e.target.value = '';
  });
});

sortBtns.forEach(sortBtn => {
  sortBtn.addEventListener('click', async function (e) {
    await sortByName(e.target);
  });

});

filmChoices.addEventListener('change', function (e) {
  filterItems(e.target);
});


delAllBtn.addEventListener('click', function (e) {
  confirmDeletion()
});



document.querySelector('.alert-no-add__button').addEventListener('click', function (e) {
  document.querySelector('.alert-no-add').classList.remove('alert-no-add--active');

});

init();
setupValidation();


function setupValidation() {
  let allInputs = myForm.querySelectorAll('.custom-input__field');
  allInputs.forEach(input => {
    const rules = []

    rules.push({
      rule: 'required',
      errorMessage: `Заполните поле "${input.parentElement.querySelector('.custom-input__label').textContent}"`,

    });
    if (input.type == 'number') {
      rules.push({
        rule: 'minNumber',
        value: 1895,
        errorMessage: `Кино появилось только в 1895 году`,
      });
      rules.push({
        rule: 'maxNumber',
        value: 2025,
        errorMessage: `Кино не может быть из будущего:)`,
      });


    }
    if (input.type == 'text') {
      rules.push({
        rule: 'maxLength',
        value: 60,
        errorMessage: `Длина строки не может превышать 60 символов`,
      });
    }
    if (rules.length > 0) {
      validate.addField(input, rules);
    }
  });

  validate.onValidate(async (result) => {
    Object.values(result.fields).forEach(field => {
      const parent = field.elem.parentElement;
      if (field.touched) {
        if (field.isValid) {
          parent.classList.remove('custom-input--error');
        } else {
          parent.classList.add('custom-input--error');
        }
      }
    });
  })

  validate.onFail(async () => {
    const errorFields = document.querySelectorAll('.just-validate-error-field');
    errorFields.forEach(field => {
      field.parentElement.classList.add('custom-input--error');
    });
  });


  validate.onSuccess(async (e) => {
    e.preventDefault()
    await addFilm();
  })
}


async function addFilm() {
  const formData = new FormData(myForm);

  const film = {
    title: formData.get('title'),
    genre: formData.get('genre'),
    releaseYear: Number(formData.get('releaseYear')),
    isWatched: myForm.querySelector('#isWatched').checked
  };

  const response = await fetch(server, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      email,
    },
    body: JSON.stringify(film)
  });
  if (!response.ok) {
    const errorData = await response.json();
    if (response.status === 400 && errorData.error == "Фильм с таким названием и годом выпуска уже существует") {
      console.warn("⚠ Предупреждение: такой фильм уже есть в списке");
      document.querySelector('.alert-no-add').classList.add('alert-no-add--active')
      document.querySelector('.alert-no-add__text').textContent = "⚠ Предупреждение: такой фильм уже есть в списке!!";
      //alert("Такой фильм уже добавлен ранее!");
    } else {
      console.error(`Ошибка при добавлении: ${response.status}`, errorData);

    }
  } else {
    console.log('Фильм добавлен на сервер');
    const films = await getAllFilms();
    renderTable(films);
    myForm.reset();

  }
}

async function renderTable(films) {
  const filmTableBody = document.querySelector('#film-tbody');
  filmTableBody.innerHTML = '';
  films.forEach((film, index) => {
    const row = document.createElement('tr');
    row.setAttribute('data-index', index)
    row.innerHTML = `
        <td>${index + 1}</td>
        <td>${film.title[0].toUpperCase() + film.title.slice(1).toLocaleLowerCase()}</td>
        <td>${film.genre.toLocaleLowerCase()}</td>
        <td>${film.releaseYear}</td>
        <td>${film.isWatched ? "Да" : "Нет"}</td>  
         <td>
            <div class="table-actions">
                <button class="btn btn--small btn--delete">Удалить</button>           
            </div>
          </td>    
    `
    Array.from(row.querySelectorAll('td')).forEach(td => {
      td.classList.add('output__table-cell');
    });
    filmTableBody.appendChild(row);
  });
  bindActionButtons();
}

function bindActionButtons() {
  document.querySelectorAll('.btn--delete').forEach(deleteBtn => {
    deleteBtn.addEventListener('click', function (e) {
      const closestTr = e.target.closest('tr');
      deleteFilm(closestTr)
    });
  });

}

async function deleteFilm(closestTr) {
  const closestIndexRow = +closestTr.dataset.index;
  const films = await getAllFilms();
  const response = await fetch(`https://sb-film.skillbox.cc/films/${films[closestIndexRow].id}`, {
    method: 'DELETE',
    headers: {
      email
    }
  });
  const updatedFilms = await getAllFilms();
  renderTable(updatedFilms);
}

function confirmDeletion() {
  const confirmDeleteWindow = document.querySelector('.alert-deletion');
  confirmDeleteWindow.classList.add('alert-deletion--active');
  confirmDeleteWindow.focus();
  const backButton = document.querySelector('.alert-deletion__button--back');
  const deleteAllBtn = document.querySelector('.alert-deletion__button--delete');
  backButton.addEventListener('click', function () {
    confirmDeleteWindow.classList.remove('alert-deletion--active');
  }, { once: true });

  deleteAllBtn.addEventListener('click', async function () {
    await deleteAllFilms();
    const allFilms = await getAllFilms();
    renderTable(allFilms);
    confirmDeleteWindow.classList.remove('alert-deletion--active');
  }, { once: true });

}


async function deleteAllFilms() {
  const response = await fetch('https://sb-film.skillbox.cc/films', {
    method: 'DELETE',
    headers: {
      email
    }
  });
  const data = await response.json();
  console.log(data);
}



async function filterItems(input) {
  const allFilms = await getAllFilms();
  const key = input.dataset.name;

  if (!key) return;

  if (input.type !== 'select-one') {
    const filteredFilms = allFilms.filter(film => {
      const value = film[key];
      return value && value.toLocaleLowerCase().includes(input.value.toLocaleLowerCase());
    });
    renderTable(filteredFilms)
  } else {
    if (input.value == "watched") {
      const watchedFilms = allFilms.filter(film => film[key] !== undefined && film[key] === true);
      renderTable(watchedFilms);
    } else if (input.value == "notWatched") {
      const notWatchedFilms = allFilms.filter(film => film[key] !== undefined && film[key] === false);
      renderTable(notWatchedFilms);
    } else {
      renderTable(allFilms);
    }
  }
}

async function sortByName(button) {
  const allFilms = await getAllFilms();
  const fieldKey = button.closest('th')?.dataset.field;

  if (!fieldKey) return;
  const isAscending = button.classList.contains('output__table-header-cell-sort-up');
  const isDescending = button.classList.contains('output__table-header-cell-sort-down');

  if (!isAscending && !isDescending) return;

  let sortedFilms = [];

  if (fieldKey === 'releaseYear') {
    sortedFilms = [...allFilms].sort((a, b) =>
      isAscending ? a[fieldKey] - b[fieldKey] : b[fieldKey] - a[fieldKey]
    );
  } else {
    sortedFilms = [...allFilms].sort((a, b) =>
      isAscending
        ? a[fieldKey].localeCompare(b[fieldKey])
        : b[fieldKey].localeCompare(a[fieldKey])
    );
  }
  renderTable(sortedFilms);
}


async function getAllFilms() {
  const response = await fetch(server, {
    headers: {
      email,
    }
  });
  const data = await response.json();
  return data;
}



async function init() {
  const films = await getAllFilms();
  renderTable(films);
}

