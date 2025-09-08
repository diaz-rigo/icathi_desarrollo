import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { ValidadorDocenteService } from '../../../../commons/services/validador-docente.service';
import { Especialidad_docente, EspecialidadesService } from '../../../../../../shared/services/especialidad.service';
import { AuthService } from '../../../../../../shared/services/auth.service';
import { EspecialidadesDocentesService } from '../../../../../../shared/services/especialidades-docentes.service';
import { PdfUploaderPreviewComponent } from '../../../../../../shared/components/pdf-uploader-preview/pdf-uploader-preview.component';
import { FormBuilder, FormGroup, FormsModule } from '@angular/forms';
import { SolicitudCursoApi, SolicitudesCursosService } from '../../../../../../shared/services/solicitudes-cursos.service';
import { Curso, CursosService } from '../../../../../../shared/services/cursos.service';
import { DocenteService } from '../../../../../../shared/services/docente.service';
import { catchError, finalize, forkJoin, map, of, switchMap } from 'rxjs';
import { DocenteHelper } from '../../../../../docente/commons/helpers/docente.helper';
// Importante: no necesitas nada extra, solo pega esto en tu componente.
type Prioridad = 'Alta' | 'Media' | 'Baja';
type Estado = 'Pendiente' | 'Aprobado' | 'Rechazado' | 'En Revisión';

interface Solicitud {
  titulo: string;
  origen: string;          // ICATHI / Modalidad Escuela / etc.
  fecha: string;           // ISO para formatear
  prioridad: Prioridad;
  estado: Estado;
  justificacion: string;
  comentarioValidador?: string;
}

@Component({
  selector: 'app-perfiles',
  templateUrl: './perfiles.component.html',
  styleUrls: ['./perfiles.component.scss'],
  standalone: true,
  imports: [PdfUploaderPreviewComponent, FormsModule,
    CommonModule]
})
export class PerfilesComponent implements OnInit {
  docenteId: string = ''; // ID del docente obtenido de la URL
  docente: any = null;
  loading: boolean = true;
  error: string | null = null;
  especialidades: Especialidad_docente[] = []; // Lista de especialidades del docente
  mostrarModal: boolean = false;
  mostrarModal_especialidad = false;
  especialidadSeleccionada: any = null;
  userId: number | null = null; // ID del usuario desde el token
  docenteData: any;
  editMode = false;
  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private location: Location,
    private router: Router,
    private authService: AuthService,
    private especialidadesService: EspecialidadesService,
    private validadorDocenteService: ValidadorDocenteService,
    private especialidadesDocentesService: EspecialidadesDocentesService,
    private docenteService: DocenteService, private svc: SolicitudesCursosService, private cursosService: CursosService
  ) { }


  // constructor(     private router: Router,
  //  private authService: AuthService,
  //   private docenteService: DocenteService,private svc: SolicitudesCursosService,private cursosService :CursosService) {}
  ngOnInit(): void {
    // Obtén el ID del usuario desde el token (si es necesario)
    this.authService.getIdFromToken().then(id => {
      this.userId = id; // Asigna el ID del usuario al componente
      console.log('ID del usuario desde el token:', this.userId);
    });
    // Obtén el ID del docente desde la URL
    this.route.paramMap.subscribe((params) => {
      this.docenteId = params.get('id') || ''; // Parámetro "id"
      if (this.docenteId) {
        this.obtenerDocente(this.docenteId);
        this.obtenerEspecialidades();

      } else {
        this.loading = false;
        this.error = 'No se encontró el ID del docente en la URL.';
      }
    });
    this.cargar();
    // this.obtenerDatosDocenteYCursos();
  }
  selectedTab: 'general' | 'solicitudes' | 'documentos' | 'contacto' = 'general';

  setTab(tab: 'general' | 'solicitudes' | 'documentos' | 'contacto') {
    this.selectedTab = tab;
  }

  isTab(tab: 'general' | 'solicitudes' | 'documentos' | 'contacto') {
    return this.selectedTab === tab;
  }

  // ---- datos
  solicitudes = signal<SolicitudCursoApi[]>([]);
  // solicitudes: Solicitud[] = [
  //   {
  //     titulo: 'Plomería Básica',
  //     origen: 'ICATHI',
  //     fecha: '2024-01-14',
  //     prioridad: 'Alta',
  //     estado: 'Pendiente',
  //     justificacion:
  //       'Necesito ampliar mis conocimientos en oficios prácticos para diversificar mi enseñanza.'
  //   },
  //   {
  //     titulo: 'Repostería Avanzada',
  //     origen: 'Modalidad Escuela',
  //     fecha: '2024-01-09',
  //     prioridad: 'Media',
  //     estado: 'Aprobado',
  //     justificacion:
  //       'Curso complementario para el programa de gastronomía',
  //     comentarioValidador: 'Aprobado por relevancia curricular'
  //   }
  // ];
  /**
  * Obtiene los datos del docente.
  * @param id ID del docente
  */
  obtenerDocente(id: string): void {
    this.validadorDocenteService.getDocenteById(id).subscribe({
      next: (docente) => {
        this.docente = docente;
        this.loading = false;
      },
      error: (err) => {
        this.error = `Error al obtener el docente: ${err.message}`;
        this.loading = false;
      }
    });
  }
  obtenerEspecialidades(): void {
    const docenteId = Number(this.docenteId); // Convertir a número
    this.especialidadesService.obtenerEspecialidadesPorDocente(docenteId).subscribe({
      next: (response) => {
        this.especialidades = response.especialidades;
        console.log("this.especialidades del docente", this.especialidades)
      },
      error: (err) => {
        this.error = `Error al obtener las especialidades: ${err.message}`;
      }
    });
  }
  abrirModal() {
    this.mostrarModal = true;
  }

  cerrarModal() {
    this.mostrarModal = false;
  }
  abrirModal_especialidad(especialidad: any) {
    this.especialidadSeleccionada = { ...especialidad };
    this.mostrarModal_especialidad = true;
  }


  guardarCambios_especialidad() {
    // Mapeo de los valores de estado a los valores numéricos correspondientes
    const estadoMap: { [key: string]: number } = {
      'pendiente': 1,
      'aprobado': 2,
      'rechazado': 3
    };

    // Asignamos el valor numérico al campo 'estatus' de la especialidad
    if (estadoMap[this.especialidadSeleccionada.estatus]) {
      this.especialidadSeleccionada.estatus_id = estadoMap[this.especialidadSeleccionada.estatus];
    }

    // Extraer datos necesarios para la solicitud
    const docenteId = Number(this.docenteId); // Convertir a número
    const especialidadId = this.especialidadSeleccionada.especialidad_id;
    const nuevoEstatusId = this.especialidadSeleccionada.estatus_id;
    const usuarioValidadorId = Number(this.userId);

    // Realizar la actualización mediante el servicio
    this.especialidadesDocentesService
      .actualizarEstatus(docenteId, especialidadId, nuevoEstatusId, usuarioValidadorId)
      .subscribe({
        next: (response) => {
          console.log('Estatus actualizado exitosamente:', response);

          // Actualizar la lista local de especialidades
          const index = this.especialidades.findIndex(
            (esp) => esp.especialidad === this.especialidadSeleccionada.especialidad
          );

          if (index !== -1) {
            this.especialidades[index] = { ...this.especialidadSeleccionada };
          }

          // Cerrar el modal
          this.cerrarModal_especialidad();
        },
        error: (err) => {
          console.error('Error al actualizar el estatus:', err);
        }
      });
  }

  cerrarModal_especialidad() {
    this.mostrarModal_especialidad = false;
    this.especialidadSeleccionada = null;
  }


  estatusMap: { [key: string]: number } = {
    Activo: 4,
    Inactivo: 5,
    'Pendiente de validación': 6,
    Suspendido: 7
  };
  actualizarEstatus() {
    const valorNumerico = this.estatusMap[this.docente.estatus_valor];
    console.log('Estatus actualizado:', valorNumerico);
    const usuarioValidadorId = Number(this.userId);

    // Aquí envías al backend el valor numérico
    alert(`Estatus cambiado Exitosamente ..`);

    this.validadorDocenteService.updateDocenteStatus(usuarioValidadorId, this.docenteId, valorNumerico)
      .subscribe(
        () => {
          this.cerrarModal()
          this.router.navigate(['/validador/docente/perfil/', this.docenteId]);

        },
        (error) => {
          alert('Error al cambiar el estado del docente.')
          // this.errorMessage = 'Error al cambiar el estado del docente.';
          console.error('Error al cambiar el estado:', error);
        }
      );
  }
  obtenerDescripcionEstatus(valor: number): string {
    const descripciones: { [key: number]: string } = {
      4: 'Activo',
      5: 'Inactivo',
      6: 'Pendiente de validación',
      7: 'Suspendido'
    };
    return descripciones[valor] || 'Desconocido';
  }
  regresar(): void {
    this.location.back();
  }

  // Colores homologados para chips de estatus (mismos de la tabla)
  estatusChipClass(status?: string) {
    switch (status) {
      case 'Pendiente de validación':
        return 'bg-orange-500 text-white';
      case 'Activo':
        return 'bg-green-500 text-white';
      case 'Inactivo':
        return 'bg-yellow-500 text-white';
      case 'Suspendido':
        return 'bg-red-500 text-white';
      default:
        return 'bg-neutral-200 text-neutral-800';
    }
  }

  // Chips para estatus de especialidad
  especialidadChipClass(est?: string) {
    switch ((est || '').toLowerCase()) {
      case 'aprobado':
        return 'bg-green-500 text-white';
      case 'pendiente':
        return 'bg-yellow-500 text-white';
      case 'rechazado':
        return 'bg-red-500 text-white';
      default:
        return 'bg-neutral-200 text-neutral-800';
    }
  }

  // Tabs con color primario de la tabla
  tabClass(tab: 'general' | 'solicitudes' | 'documentos' | 'contacto') {
    const base = 'whitespace-nowrap px-4 py-3 text-sm font-medium border-b-2';
    const active = 'border-[#44509D] text-[#44509D]';
    const inactive = 'border-transparent text-neutral-500 hover:text-[#44509D] hover:border-[#44509D]/70';
    return `${base} ${this.selectedTab === tab ? active : inactive}`;
  }




  prioridadClasses(p: Prioridad): string {
    switch (p) {
      case 'Alta':
        return 'bg-red-50 text-red-700 ring-1 ring-red-200';
      case 'Media':
        return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200';
      default:
        return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
    }
  }

  estadoClasses(e: Estado): string {
    switch (e) {
      case 'Pendiente':
        return 'bg-yellow-100 text-yellow-800';
      case 'Aprobado':
        return 'bg-emerald-100 text-emerald-800';
      default:
        return 'bg-rose-100 text-rose-800';
    }
  }

  // Iconos en texto (opcional) por accesibilidad
  estadoIcon(e: Estado): string {
    return e === 'Aprobado' ? '✅' : e === 'Pendiente' ? '🟡' : '❌';
  }



  // mostrar solicitudes1
  cursosMap = signal<Map<number, Curso>>(new Map());
  // async obtenerDatosDocenteYCursos(): Promise<void> {
  //   this.docenteData = await DocenteHelper.obtenerDatosDocenteYCursos(
  //     this.authService,
  //     this.docenteService
  //   );
  //   // console.log("this.docenteData",this.docenteData)
  //   this.docenteId = this.docenteData.id
  //   console.log("this.docenteId", this.docenteId)
  // }
  cargar(): void {
    this.loading = true;
    // this.errorMsg=null;

    this.svc.listarSolicitudes({
      docenteId: Number(this.docenteId),
      // estado: this.activo() === 'ALL' ? undefined : this.activo(),
      // page: this.page(),
      // pageSize: this.pageSize(),
    })
      .pipe(
        switchMap((res) => {
          const solicitudes = res.solicitudes as SolicitudCursoApi[];
          this.solicitudes.set(solicitudes);
          // this.total.set(res.total ?? solicitudes.length);

          // IDs de curso únicos
          const uniqueIds = Array.from(
            new Set(
              solicitudes
                .map(s => s.cursoId)
                .filter((id): id is number => typeof id === 'number')
            )
          );

          if (uniqueIds.length === 0) {
            // No hay cursos, vaciamos el mapa y seguimos
            this.cursosMap.set(new Map());
            return of(null);
          }

          // Pedimos todos los cursos en paralelo
          const peticiones = uniqueIds.map(id => this.cursosService.getCursoById(id));

          return forkJoin(peticiones).pipe(
            map((cursos: Curso[]) => {
              const mapa = new Map<number, Curso>(cursos.map(c => [c.id, c]));
              this.cursosMap.set(mapa);
              return null;
            })
          );
        }),
        catchError(err => {
          console.error('Error al cargar:', err);
          // this.errorMsg.set('No se pudieron cargar las solicitudes o los cursos.');
          // en caso de error, mantenemos datos previos
          return of(null);
        }),
        finalize(() => this.loading = false)
      )
      .subscribe(() => {
        // listo
        console.log('Solicitudes:', this.solicitudes());
        // console.log('CursosMap:', this.cursosMap());
      });
  }

editingId = signal<number | null>(null);

// Helper para saber si una card está en edición
isEditing(id: number) {
  return this.editingId() === id;
}

// Ajusta tu toggleEdit() para que reciba el id de la solicitud
toggleEdit(id?: number) {
  // si ya está en edición, cancela; si no, activa para ese id
  this.editingId.set(this.editingId() === id ? null : (id ?? null));
}

  private savingIds = signal<Set<number>>(new Set());

  isSaving(id: number) {
    return this.savingIds().has(id);
  }
  private get evaluadorId(): number | undefined {
    try {
      // ej.: this.authService.userValue?.id || this.authService.usuario?.id
      const u: any = (this.authService as any)?.user || (this.authService as any)?.usuario || null;
      return u?.id ?? u?.userId ?? undefined;
    } catch { return undefined; }
  }

  private setSaving(id: number, saving: boolean) {
    const set = new Set(this.savingIds());
    if (saving) set.add(id); else set.delete(id);
    this.savingIds.set(set);
  }
  onActualizar(s: SolicitudCursoApi) {
    console.log(s)
    // Optimista: ya tienes s.estado y s.respuestaMensaje en el modelo
    this.setSaving(s.id, true);
    console.log(s.estado,
      s.respuestaMensaje,
      this.evaluadorId)
    // 1) Cambiar estado en su endpoint
    this.svc.cambiarEstado(s.id, {
      estado: s.estado,
      respuestaMensaje: s.respuestaMensaje ?? '',
      evaluadorId: this.evaluadorId
    })
      .pipe(
        // 2) Guardar respuestaMensaje si existe (o vacía)
        switchMap(() => this.svc.actualizarSolicitud(s.id, {
          respuestaMensaje: s.respuestaMensaje ?? ''
        })),
        finalize(() => this.setSaving(s.id, false)),
        catchError(err => {
          console.error('Error al actualizar solicitud', err);
          // revertir si quieres (ejemplo simple: recargar)
          // this.cargar();
          return of(null);
        })
      )
      .subscribe(resp => {
        // Si tu API regresa el recurso actualizado, sincroniza el arreglo local:
        if (resp) {
          this.solicitudes.update(list =>
            list.map(it => it.id === s.id ? { ...it, ...resp } as any : it)
          );
        }
      });
  }
}
