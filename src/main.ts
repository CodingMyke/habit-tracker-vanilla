// Definizione dei tipi
interface Habit {
  id: string;
  name: string;
  streak: number;
  lastChecked: string | null;
  completed: boolean;
}

// Classe per la gestione delle abitudini (solo logica di business)
class HabitManager {
  private habits: Habit[] = [];

  constructor() {
    this.loadHabits();
    this.checkForNewDay();
  }

  // Carica le abitudini dal localStorage
  private loadHabits(): void {
    const savedHabits = localStorage.getItem("habits");
    if (savedHabits) {
      this.habits = JSON.parse(savedHabits);
    }
  }

  // Salva le abitudini nel localStorage
  private saveHabits(): void {
    localStorage.setItem("habits", JSON.stringify(this.habits));
  }

  // Controlla se è un nuovo giorno e aggiorna gli streak
  private checkForNewDay(): void {
    const today = new Date().toDateString();
    const lastOpened = localStorage.getItem("lastOpened");

    if (lastOpened !== today) {
      this.habits.forEach((habit) => {
        // Se l'abitudine è stata completata ieri, incrementa lo streak
        if (habit.completed && habit.lastChecked === lastOpened) {
          habit.streak += 1;
        } else if (!habit.completed && habit.streak > 0) {
          // Resetta lo streak se l'abitudine non è stata completata ieri
          habit.streak = 0;
        }

        habit.completed = false;
        habit.lastChecked = null;
      });

      // Salva la data corrente come lastOpened
      localStorage.setItem("lastOpened", today);
      this.saveHabits();
    }
  }

  // Ottieni tutte le abitudini
  getHabits(): Habit[] {
    return [...this.habits];
  }

  // Ottieni una singola abitudine per ID
  getHabitById(id: string): Habit | null {
    return this.habits.find((h) => h.id === id) || null;
  }

  // Controlla se esiste già un'abitudine con lo stesso nome
  habitExists(name: string, excludeId: string = ""): boolean {
    return this.habits.some(
      (habit) =>
        habit.name.toLowerCase() === name.toLowerCase() &&
        habit.id !== excludeId
    );
  }

  // Aggiungi una nuova abitudine
  addHabit(name: string): Habit | null {
    if (this.habitExists(name)) {
      return null;
    }

    const newHabit: Habit = {
      id: Date.now().toString(),
      name: name.trim(),
      streak: 0,
      lastChecked: null,
      completed: false,
    };

    this.habits.push(newHabit);
    this.saveHabits();
    return newHabit;
  }

  // Modifica un'abitudine esistente
  editHabit(id: string, newName: string): boolean {
    // Controlla se esiste già un'abitudine con lo stesso nome (escludendo quella corrente)
    if (this.habitExists(newName, id)) {
      return false;
    }

    const habit = this.habits.find((h) => h.id === id);
    if (habit) {
      habit.name = newName.trim();
      this.saveHabits();
      return true;
    }
    return false;
  }

  // Elimina un'abitudine
  deleteHabit(id: string): void {
    this.habits = this.habits.filter((h) => h.id !== id);
    this.saveHabits();
  }

  // Elimina tutte le abitudini
  clearAllHabits(): void {
    this.habits = [];
    this.saveHabits();
  }

  // Cambia lo stato di completamento di un'abitudine
  toggleHabit(id: string): Habit | null {
    const habit = this.habits.find((h) => h.id === id);

    if (habit) {
      const today = new Date().toDateString();

      // Cambia lo stato di completamento
      habit.completed = !habit.completed;

      if (habit.completed) {
        habit.lastChecked = today;
        // Incrementa lo streak solo se è la prima volta che viene completata oggi
        habit.streak += 1;
      } else {
        // Se viene deselezionata, decrementa lo streak se era appena stato incrementato
        if (habit.streak > 0 && habit.lastChecked === today) {
          habit.streak -= 1;
          habit.lastChecked = null;
        }
      }

      this.saveHabits();
      return habit;
    }

    return null;
  }

  // Calcola la percentuale di completamento
  getCompletionPercentage(): number {
    if (this.habits.length === 0) return 0;

    const completedCount = this.habits.filter(
      (habit) => habit.completed
    ).length;
    return Math.round((completedCount / this.habits.length) * 100);
  }
}

// Funzioni per la manipolazione del DOM
function initApp(): void {
  const habitManager = new HabitManager();

  // Elementi DOM
  const habitInput = document.getElementById("habit-input") as HTMLInputElement;
  const habitError = document.getElementById("habit-error") as HTMLElement;
  const saveButton = document.getElementById("save-habit-btn") as HTMLElement;
  const cancelButton = document.getElementById("cancel-btn") as HTMLElement;
  const closeModalButton = document.getElementById(
    "close-modal"
  ) as HTMLElement;
  const showModalButton = document.getElementById(
    "show-add-modal"
  ) as HTMLElement;
  const clearAllButton = document.getElementById(
    "clear-all-btn"
  ) as HTMLElement;
  const modal = document.getElementById("habit-modal") as HTMLElement;
  const modalTitle = document.getElementById("modal-title") as HTMLElement;
  const editHabitId = document.getElementById(
    "edit-habit-id"
  ) as HTMLInputElement;
  const habitsList = document.getElementById("habits-list") as HTMLElement;
  const currentDateElement = document.getElementById(
    "current-date"
  ) as HTMLElement;
  const currentDayElement = document.getElementById(
    "current-day"
  ) as HTMLElement;
  const progressBar = document.getElementById("progress-bar") as HTMLElement;
  const progressPercentage = document.getElementById(
    "progress-percentage"
  ) as HTMLElement;

  // Inizializza l'app
  updateDateDisplay();
  renderHabits();
  updateStats();
  setupEventListeners();

  // Funzione per aggiornare la visualizzazione della data
  function updateDateDisplay(): void {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    currentDayElement.textContent = now.toLocaleDateString("it-IT", options);
    currentDateElement.textContent = "Oggi";
  }

  // Funzione per configurare gli event listener
  function setupEventListeners(): void {
    // Mostra modale per aggiungere
    showModalButton.addEventListener("click", () => openModal());

    // Chiudi modale
    closeModalButton.addEventListener("click", closeModal);

    // Annulla
    cancelButton.addEventListener("click", closeModal);

    // Salva abitudine (aggiunta o modifica)
    saveButton.addEventListener("click", saveHabit);

    // Tasto Invio nel campo di input
    habitInput.addEventListener("keypress", (e: KeyboardEvent) => {
      if (e.key === "Enter") saveHabit();
    });

    // Chiudi modale cliccando fuori
    modal.addEventListener("click", (e: MouseEvent) => {
      if (e.target === modal) {
        closeModal();
      }
    });

    // Rimuovi tutte le abitudini
    clearAllButton.addEventListener("click", clearAllHabits);
  }

  // Funzione per aprire la modale (aggiunta o modifica)
  function openModal(habitId: string = ""): void {
    // Resetta il form
    habitInput.value = "";
    habitError.textContent = "";
    editHabitId.value = habitId;

    if (habitId) {
      // Modalità modifica
      const habit = habitManager.getHabitById(habitId);
      if (habit) {
        habitInput.value = habit.name;
        modalTitle.textContent = "Modifica abitudine";
        saveButton.textContent = "Aggiorna";
      }
    } else {
      // Modalità aggiunta
      modalTitle.textContent = "Aggiungi nuova abitudine";
      saveButton.textContent = "Aggiungi";
    }

    modal.classList.add("active");
    habitInput.focus();
  }

  // Funzione per chiudere la modale
  function closeModal(): void {
    modal.classList.remove("active");
    habitInput.value = "";
    habitError.textContent = "";
    editHabitId.value = "";
  }

  // Funzione per salvare un'abitudine (aggiunta o modifica)
  function saveHabit(): void {
    const habitName = habitInput.value.trim();
    const editId = editHabitId.value;

    if (!habitName) {
      habitError.textContent = "Inserisci un nome per l'abitudine";
      return;
    }

    let success = false;

    if (editId) {
      // Modalità modifica
      success = habitManager.editHabit(editId, habitName);
      if (!success) {
        habitError.textContent = "Esiste già un'abitudine con questo nome";
        return;
      }
    } else {
      // Modalità aggiunta
      const newHabit = habitManager.addHabit(habitName);
      if (!newHabit) {
        habitError.textContent = "Esiste già un'abitudine con questo nome";
        return;
      }
      success = true;
    }

    if (success) {
      renderHabits();
      updateStats();
      closeModal();
    }
  }

  // Funzione per eliminare un'abitudine
  function deleteHabit(id: string): void {
    if (confirm("Sei sicuro di voler eliminare questa abitudine?")) {
      habitManager.deleteHabit(id);
      renderHabits();
      updateStats();
    }
  }

  // Funzione per eliminare tutte le abitudini
  function clearAllHabits(): void {
    if (habitManager.getHabits().length === 0) {
      return;
    }

    if (
      confirm(
        "Sei sicuro di voler eliminare tutte le abitudini? Questa azione non può essere annullata."
      )
    ) {
      habitManager.clearAllHabits();
      renderHabits();
      updateStats();
    }
  }

  // Funzione per cambiare lo stato di completamento di un'abitudine
  function toggleHabit(id: string): void {
    habitManager.toggleHabit(id);
    renderHabits();
    updateStats();
  }

  // Funzione per renderizzare le abitudini
  function renderHabits(): void {
    const habits = habitManager.getHabits();
    habitsList.innerHTML = "";

    if (habits.length === 0) {
      const emptyMessage = document.createElement("div");
      emptyMessage.className = "empty-habits-message";
      emptyMessage.innerHTML = `
              <p>Non hai ancora abitudini. Aggiungi la tua prima abitudine!</p>
          `;
      habitsList.appendChild(emptyMessage);
      return;
    }

    habits.forEach((habit) => {
      const habitElement = document.createElement("div");
      habitElement.className = `habit-item ${
        habit.completed ? "completed" : ""
      }`;

      habitElement.innerHTML = `
              <input type="checkbox" class="habit-check" ${
                habit.completed ? "checked" : ""
              }>
              <span class="habit-name">${habit.name}</span>
              <span class="habit-streak">
                  <i class="fas fa-fire"></i> ${habit.streak}
              </span>
              <div class="habit-actions">
                  <button class="edit-btn" title="Modifica">
                      <i class="fas fa-edit"></i>
                  </button>
                  <button class="delete-btn" title="Elimina">
                      <i class="fas fa-trash"></i>
                  </button>
              </div>
          `;

      // Aggiungi event listener
      const checkbox = habitElement.querySelector(
        ".habit-check"
      ) as HTMLInputElement;
      const editBtn = habitElement.querySelector(".edit-btn") as HTMLElement;
      const deleteBtn = habitElement.querySelector(
        ".delete-btn"
      ) as HTMLElement;

      checkbox.addEventListener("change", () => toggleHabit(habit.id));
      editBtn.addEventListener("click", () => openModal(habit.id));
      deleteBtn.addEventListener("click", () => deleteHabit(habit.id));

      habitsList.appendChild(habitElement);
    });
  }

  // Funzione per aggiornare la barra di progresso
  function updateProgressBar(percentage: number): void {
    progressBar.style.background = `conic-gradient(var(--accent-color) ${percentage}%, transparent ${percentage}%)`;
    progressPercentage.textContent = `${percentage}%`;
  }

  // Funzione per aggiornare le statistiche
  function updateStats(): void {
    const percentage = habitManager.getCompletionPercentage();
    updateProgressBar(percentage);

    // Aggiorna il testo motivazionale in base alla percentuale
    const progressInfo = document.querySelector(".progress-info");
    if (progressInfo) {
      const heading = progressInfo.querySelector("h4") as HTMLElement;
      const text = progressInfo.querySelector("p") as HTMLElement;

      if (percentage === 0 && habitManager.getHabits().length === 0) {
        heading.textContent = "Inizia oggi!";
        text.textContent = "Aggiungi la tua prima abitudine";
      } else if (percentage === 0) {
        heading.textContent = "Inizia ora!";
        text.textContent = "Completa le tue abitudini oggi";
      } else if (percentage < 50) {
        heading.textContent = "Buon inizio!";
        text.textContent = "Continua a completare le tue abitudini";
      } else if (percentage < 100) {
        heading.textContent = "Ottimo lavoro!";
        text.textContent = "Sei sulla buona strada";
      } else {
        heading.textContent = "Perfetto!";
        text.textContent = "Hai completato tutte le abitudini oggi";
      }
    }
  }
}

// Inizializza l'app quando il DOM è caricato
document.addEventListener("DOMContentLoaded", initApp);
