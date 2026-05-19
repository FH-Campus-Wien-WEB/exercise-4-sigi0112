import { ButtonBuilder, ElementBuilder, MovieBuilder } from "./builders.js";

// Externalized message strings
const messages = {
  dataLoadError: 'Daten konnten nicht geladen werden, Status',
  movieAlreadyInCollection: 'Film bereits in der Sammlung.',
  addMovieFailed: 'Hinzufügen des Films ist fehlgeschlagen.',
  deleteMovieFailed: 'Film konnte nicht gelöscht werden.',
  noResultsFound: 'Keine Ergebnisse gefunden.',
  searchFailed: 'Die Suche ist fehlgeschlagen...',
  loggedOutGreeting: 'Bitte logge dich ein, um deine Filmkollektion zu sehen.',
  loginFailed: 'Login failed'
};

let currentSession = null;

function updateGenres() {
  const header = document.querySelector('nav>h2');
  const listElement = document.querySelector("#filter");

  listElement.innerHTML = '';

  if (!currentSession) {
    header.style.display = 'none';
    return;
  }

  fetch("/genres")
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(genres => {
      header.style.display = 'block';
      new ElementBuilder("li").append(new ButtonBuilder("All").onclick(() => loadMovies()))
        .appendTo(listElement);

      for (const genre of genres) {
        new ElementBuilder("li").append(new ButtonBuilder(genre).onclick(() => loadMovies(genre)))
          .appendTo(listElement);
      }

      const firstButton = listElement.querySelector("button");
      if (firstButton) {
        firstButton.click();
      }
    })
    .catch(error => {
      console.error('Failed to load genres:', error);
      listElement.append(`${messages.dataLoadError} ${error.message}`);
    });
}

function removeMovies() {
  const mainElement = document.querySelector("main");
  while (mainElement.childElementCount > 0) {
    mainElement.firstChild.remove();
  }
}

function loadMovies(genre) {
  const url = new URL("/movies", location.href);
  if (genre) {
    url.searchParams.set("genre", genre);
  }

  fetch(url)
    .then(response => {
      removeMovies();
      const mainElement = document.querySelector("main");

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(movies => {
      const mainElement = document.querySelector("main");
      movies.forEach(movie => new MovieBuilder(movie, deleteMovie, Boolean(currentSession)).appendTo(mainElement));
    })
    .catch(error => {
      console.error('Failed to load movies:', error);
      const mainElement = document.querySelector("main");
      mainElement.append(`${messages.dataLoadError} ${error.message}`);
    });
}

function addMovie(imdbID) {
  fetch(`/movies/${imdbID}`, { method: 'PUT' })
    .then(response => {
      if (response.status === 201) {
        // Task 2.2: Make sure to remove the added movie from the search results to avoid
        // giving the user the option to add it again.
    const searchItem = document.getElementById(`search-item-${imdbID}`);
        if (searchItem) {
          searchItem.remove();
        }
        fetch("/session")
          .then(() => {
            loadMovies();
            updateGenres();
          })
          .catch(() => {
            // Falls der Session-Check fehlschlägt, laden wir trotzdem die Filme
            loadMovies();
            updateGenres();
          });
      } else if (response.status === 200) {
        alert(messages.movieAlreadyInCollection);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    })
    .catch(error => {
      console.error('Failed to add movie:', error);
      alert(messages.addMovieFailed);
    });
}

function deleteMovie(imdbID) {
  fetch(`/movies/${imdbID}`, { method: 'DELETE' })
    .then(response => {
      if (response.ok) {
        const article = document.getElementById(imdbID);
        if (article) {
          article.remove();
        }
        updateGenres();
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    })
    .catch(error => {
      console.error('Failed to delete movie:', error);
      alert(messages.deleteMovieFailed);
    });
}

function searchMovies(query) {
  fetch(`/search?query=${encodeURIComponent(query)}`)
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(results => {
      const resultsDiv = document.getElementById("searchResults");
      resultsDiv.innerHTML = '';

     if (!results || results.length === 0) {
        new ElementBuilder("p")
          .text(messages.noResultsFound)
          .appendTo(resultsDiv);
        return;
      }

      // Fall 2: Ergebnisse rendern
      results.forEach(movie => {
        // Wir nutzen .with(), da das der "Lehrer-Standard" in deiner builders.js ist!
        const itemRow = new ElementBuilder("div")
          .with("id", `search-item-${movie.imdbID}`)
          .with("style", "display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;");

        // Text-Inhalt (Titel + Jahr)
        const infoText = new ElementBuilder("span")
          .text(`${movie.Title} (${movie.Year || 'N/A'})`);

        // "Add"-Button mit der originalen .onclick()-Methode aus der ButtonBuilder-Klasse
        const addBtn = new ButtonBuilder("Add")
          .onclick(() => addMovie(movie.imdbID));

        // Alles sauber im Builder-Pattern zusammenbauen
        itemRow.append(infoText).append(addBtn).appendTo(resultsDiv);
      });
      // Task 2.2: Render the results returned from the server. Make sure to
      // include an "Add" button for each result that calls `addMovie(imdbID)` when clicked.
      // There is a second part to this task, in `addMovie`

    })
    .catch(error => {
      console.error('Search failed:', error);
      const resultsDiv = document.getElementById("searchResults");
      new ElementBuilder("p").text(messages.searchFailed).appendTo(resultsDiv);
    });
}

window.onload = function () {
  // Check session
  fetch("/session")
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(data => {
      currentSession = data || null;
      updateUI();
    })
    .catch(error => {
      console.error('Failed to load session:', error);
      currentSession = null;
      updateUI();
    });

  function renderUserGreeting() {
    const greetingElement = document.getElementById('userGreeting');
    if (currentSession) {
      // Task 1.2: Render a user greeting to `#userGreeting` 
      // using `firstName`, `lastName`, and the server-provided
      // login timestamp.
      const loginDate = new Date(currentSession.loginTime);
    
  
    const dateOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    const formattedDate = new Intl.DateTimeFormat('de-DE', dateOptions).format(loginDate);
    
    
    const timeOptions = { hour: '2-digit', minute: '2-digit' };
    const formattedTime = new Intl.DateTimeFormat('de-DE', timeOptions).format(loginDate);

    greetingElement.textContent = `Hi ${currentSession.firstName} ${currentSession.lastName}, du hast dich am ${formattedDate} um ${formattedTime} angemeldet.`;
    } else {
      greetingElement.textContent = messages.loggedOutGreeting;
    }
  }

  function updateUI() {
    const authBtn = document.getElementById('authBtn');
    const addMoviesBtn = document.getElementById('addMoviesBtn');

    renderUserGreeting();
    updateGenres();

    if (currentSession) {
      authBtn.textContent = 'Logout';
      authBtn.onclick = () => {
        fetch("/logout")
          .then(response => {
            if (response.ok) {
              currentSession = null;
              updateUI();
            }
          })
          .catch(error => {
            console.error('Logout failed:', error);
          });
      };
      addMoviesBtn.style.display = 'inline';
    } else {
      removeMovies();
      authBtn.textContent = 'Login';
      authBtn.onclick = () => {
        const loginForm = document.getElementById('loginForm');
        loginForm.reset();
        document.getElementById('loginDialog').showModal();
      };
      addMoviesBtn.style.display = 'none';
    }
  }

  // Login dialog
  document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);


   const data = Object.fromEntries(formData.entries());

  fetch("/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(messages.loginFailed);
    }
    return response.json();
  })
  .then(sessionData => {
    currentSession = sessionData;
    document.getElementById('loginDialog').close();
    updateUI();
    loadMovies();
  })
  .catch(error => {
    console.error('Login failed:', error);
    alert(messages.loginFailed);
  });
});
    // Task 1.1: Implement the login submit flow to call `POST /login` 
    // with username and password, handle errors, save the response 
    // into `currentSession`, then call `updateUI()` and `loadMovies()`.

  document.getElementById('cancelLogin').addEventListener('click', () => {
    document.getElementById('loginDialog').close();
  });

  // Search dialog
  document.getElementById('addMoviesBtn').addEventListener('click', () => {
    const searchForm = document.getElementById('searchForm');
    searchForm.reset();
    document.getElementById('searchResults').innerHTML = '';
    document.getElementById('searchDialog').showModal();
  });

  document.getElementById('searchForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const query = document.getElementById('query').value;
    searchMovies(query);
  });

  document.getElementById('cancelSearch').addEventListener('click', () => {
    document.getElementById('searchDialog').close();
  });
};

