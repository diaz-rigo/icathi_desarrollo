import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../../../environments/environment.prod';
import { AuthService } from '../../../../../../shared/services/auth.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DocenteService } from '../../../../../../shared/services/docente.service';
import { response } from 'express';
import { CursosdocentesService } from '../../../../../../shared/services/cursosdocentes.service';
import { CursosService } from '../../../../../../shared/services/cursos.service';
export interface Modulo {
  id: number;
  nombre: string;
  clave?: string;
  duracion_horas: number;
  descripcion: string;
  nivel: string;
  costo?: number;
  requisitos?: string;
  estatus?: string;
  area_id?: number;
  especialidad_id?: number;
  tipo_curso_id?: number;
  vigencia_inicio?: string;
  fecha_publicacion?: string;
  ultima_actualizacion?: string;
  plantel_id: number;
  docente_asignado: string;
}

interface Docente {
  id: number;
  nombre: string;
  estatus: boolean;
  // Otros campos que necesites
}

declare var $: any;
@Component({
  selector: 'app-listado-cursos',
  templateUrl: './listado-cursos.component.html',
  styles: `textarea{
    field-sizing:content;
  }

  `,
})
export class ListadoCursosComponent implements OnInit {
  cursosByEspecialidad: any[] = [];
  cursosSolicitados: Modulo[] = [];
  especialidadesByArea: any[] = [];
  modulosF: Modulo[] = [];
  modulosFiltrados: Modulo[] = [];
  docentes: Docente[] = [];
  // docente;
  areas: any[] = [];
  tiposCurso: any[] = [];
  mostrarFormulario = false;
  mostrarModal = false;
  mostrarDetalleModal = false; // Nueva variable para el modal de detalles
  cursoSeleccionado: Modulo | null = null;
  cursoDetalleSeleccionado: Modulo | null = null; // Curso seleccionado para ver detalles
  idCUrso: any;
  areaSelccionado: any;
  curso_id!: number;
  cursoForm: FormGroup;
  private apiUrl = `${environment.api}`;

  isUploading: boolean = false; // Estado para saber si está cargando
  // progressPercent: number = 0;  // Porcentaje del progreso
  //
  // progressText: string = '0 of 100 done';  // Texto que muestra el progreso

  // private fakeProgress: any; // Variable para manejar el intervalo

  constructor(
    private docenteService: DocenteService,
    private http: HttpClient,
    private authService: AuthService,
    private cursosService: CursosService,
    private fb: FormBuilder
  ) {
    // this.plantel_id = this.authService.getIdFromToken();
    this.cursoForm = this.fb.group({
      especialidad_id: ['', Validators.required], // Especialidad (obligatoria)
      curso_id: ['', Validators.required], // Curso (obligatorio)
      horario: ['', Validators.required], // Horario (obligatorio)
      cupo_maximo: [
        '',
        [Validators.required, Validators.min(1), Validators.max(100)], // Cupo máximo (entre 1 y 100)
      ],
      requisitos_extra: [''], // Requisitos adicionales (opcional)
      fecha_inicio: ['', Validators.required], // Fecha de inicio (obligatoria)
      fecha_fin: ['', Validators.required], // Fecha de fin (obligatoria)
    });
  }
  // progressPercent: number = 0;  // Porcentaje de progreso
  // progressText: string = 'Cargando...';  // Texto a mostrar
  // startUpload(): void {
  //   this.isUploading = true;
  //   this.progressPercent = 0;
  //   this.progressText = '0 of 100 done';

  //   // Simular el progreso
  //   this.fakeProgress = setInterval(() => {
  //     this.progressPercent += 1;
  //     this.progressText = `${this.progressPercent} of 100 done`;

  //     if (this.progressPercent >= 100) {
  //       clearInterval(this.fakeProgress); // Detiene la simulación cuando llega al 100%
  //       this.isUploading = false;
  //     }
  //   }, 2000); // Incrementa cada 100ms
  // }

  ngOnInit(): void {
    // this.initializeProgressBar();

    this.cargarAreas();

    // this.cargarEspecialidades();

    // this.cargarTiposCurso();
  }

  isModalOpen = false;
  modulo: any = {};
  filtroId: string = '';
  filtroNombre: string = '';
  filtroNivel: string = '';
  filtroDuracion: number | null = null; // Puede ser null para indicar que no hay filtro
  // this.filtroDocente = docenteId;

  // Función para reiniciar filtros
  resetFilters() {
    this.filtroId = '';
    this.filtroNombre = '';
    this.filtroNivel = '';
    this.filtroDuracion = null;
  }

  openModal(idCurso: any) {
    this.idCUrso = idCurso;
    this.isModalOpen = true;
  }
  closeModal() {
    this.isModalOpen = false;
  }

  // cargarCursosByIdPlantel(): void {
  //   this.authService.getIdFromToken().then((plantelId) => {
  //     console.log('Plantel ID:', plantelId);

  //     if (!plantelId) {
  //       console.error('No se pudo obtener el ID del plantel');
  //       return;
  //     }
  //     this.http
  //       .get<Modulo[]>(
  //         `${this.apiUrl}/planteles-curso/byIdPlantel/${plantelId}`
  //       )
  //       .subscribe({
  //         next: (data) => {
  //           this.cursosSolicitados = data;

  //           this.modulosF = data.filter(
  //             (modulo) => modulo.estatus && modulo.docente_asignado !== '0'
  //           );
  //           this.modulosFiltrados = [...this.modulosF]; // Asignar los módulos filtrados
  //           this.filtrarModulos();
  //         },
  //         error: (err) => {
  //           console.error('Error al cargar los módulos:', err);
  //         },
  //       });
  //   });
  // }

  filtrarModulos(): void {
    this.cursosSolicitados = this.cursosSolicitados.filter((modulo) => {
      const matchesId = this.filtroId
        ? modulo.id.toString().includes(this.filtroId)
        : true;
      const matchesNombre = this.filtroNombre
        ? modulo.nombre.toLowerCase().includes(this.filtroNombre.toLowerCase())
        : true;
      const matchesNivel = this.filtroNivel
        ? modulo.nivel.toLowerCase().includes(this.filtroNivel.toLowerCase())
        : true;
      const matchesDuracion =
        this.filtroDuracion !== null
          ? modulo.duracion_horas === this.filtroDuracion
          : true;

      return matchesId && matchesNombre && matchesNivel && matchesDuracion;
    });
  }

  cargarAreas(): void {
    this.http.get<any[]>(`${this.apiUrl}/areas`).subscribe({
      next: (data) => {
        this.areas = data;
      },
      error: (err) => {
        console.error('Error al cargar áreas:', err);
      },
    });
  }

  toggleFormulario(): void {
    this.mostrarFormulario = !this.mostrarFormulario;
  }

  // en la tabla,solicitamos el curso seleccionando el area
  solicitarCurso(areaId: number): void {
    this.mostrarFormulario = true;
    this.getEspecialidadesByAreaId(areaId);
  }
  // en el modal obtenemos las especialidades por el area seleccionado
  // "http://localhost:3000/especialidades/byAreaId/{areaId}"
  getEspecialidadesByAreaId(areaId: number) {
    this.cursosService.getEspecialidadesByAreaId(areaId).subscribe(
      (especialidades) => {
        this.especialidadesByArea = especialidades;
      },
      (error) => {
        console.error('Error al obtener las especialidades:', error);
      }
    );
  }

  // carga nuevamente los cursos al cambiar de especialidad
  onEspecialidadChange(event: Event): void {
    const especialidadId = Number((event.target as HTMLSelectElement).value); // Obtener el ID de la especialidad seleccionada
    if (!isNaN(especialidadId)) {
      this.getCursosByEspecialidadId(especialidadId); // Cargar cursos relacionados
    } else {
      console.warn('Especialidad no válida seleccionada.');
    }
  }

  // obtiene los cursos por especialidad seleccionado
  // http://localhost:3000/cursos/byEspecialidadId/{especialidadId}
  getCursosByEspecialidadId(especialidadId: number): void {
    this.cursosService.getCursosByEspecialidadId(especialidadId).subscribe(
      (cursos) => {
        this.cursosByEspecialidad = cursos; // Actualizar los cursos disponibles
      },
      (error) => {
        console.error('Error al obtener los cursos:', error);
      }
    );
  }

  enviarSolicitud(): void {
    console.log('Inicio de la solicitud');

    if (!this.cursoForm.valid) {
      console.error('El formulario contiene errores o campos vacíos');
      return;
    }

    this.authService
      .getIdFromToken()
      .then((plantelId) => {
        if (!plantelId) {
          console.error('No se pudo obtener el ID del plantel');
          return;
        }

        // Construir el objeto con los datos del formulario
        const cursoData = {
          plantelId: Number(plantelId),
          curso_id: this.cursoForm.get('curso_id')?.value.toString(), // Convertir a string si es necesario
          horario: this.cursoForm.get('horario')?.value,
          cupo_maximo: this.cursoForm.get('cupo_maximo')?.value.toString(), // Convertir a string si es necesario
          requisitos_extra: this.cursoForm.get('requisitos_extra')?.value,
          fecha_inicio: this.cursoForm.get('fecha_inicio')?.value,
          fecha_fin: this.cursoForm.get('fecha_fin')?.value,
        };

        console.log('Datos enviados al backend:', cursoData);

        // Enviar el objeto al servicio
        this.http.post<Modulo>(`${this.apiUrl}/planteles-curso`, cursoData).subscribe({
          next: (cursoCreado) => {
            this.cursosSolicitados.push(cursoCreado);
            this.mostrarFormulario = false;
            console.log('Curso agregado correctamente:', cursoCreado);
          },
          error: (err) => {
            console.error('Error al agregar el curso:', err);
          },
        });
      })
      .catch((error) => {
        console.error('Error al obtener el ID del plantel:', error);
      });
  }


  cancelarSolicitud(adi: any) {}

  // Métodos para ver detalles
  verDetalles(curso: Modulo): void {
    this.cursoDetalleSeleccionado = curso;
    this.mostrarDetalleModal = true;
  }

  cerrarDetalleModal(): void {
    this.mostrarDetalleModal = false;
    this.cursoDetalleSeleccionado = null;
  }

  //*************************FILE */}
  selectedFile: File | null = null;
  // isUploading = false;
  fileExtension: string = '';

  // Evento cuando se selecciona un archivo
  onFileSelect(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.fileExtension = this.getFileExtension(file.name);
      this.uploadFile(file); // Iniciar carga del archivo
    }
  }

  // Subir el archivo
  uploadFile(file: File): void {}

  // Eliminar archivo
  removeFile(): void {
    this.selectedFile = null;
    this.fileExtension = '';
  }

  // Obtener la extensión del archivo
  getFileExtension(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    return ext;
  }

  // Manejar eventos de arrastre
  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file) {
      this.selectedFile = file;
      this.fileExtension = this.getFileExtension(file.name);
      this.uploadFile(file);
    }
  }

  onDragLeave(event: DragEvent): void {
    // Se puede agregar algún efecto visual para cuando el archivo sale del área
  }
}
