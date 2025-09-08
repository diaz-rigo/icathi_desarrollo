import {
  Component,
  Input,
  OnChanges,
  OnInit,
  signal,
  SimpleChanges,
} from "@angular/core";
import { environment } from "../../../../../../../environments/environment.prod";
import { HttpClient } from "@angular/common/http";
import { PDFDocumentProxy } from "ng2-pdf-viewer";
import { DomSanitizer } from "@angular/platform-browser";
import { ConfirmTaiwilService } from "../../../../../../shared/services/confirm-taiwil.service";
import { AlertTaiwilService } from "../../../../../../shared/services/alert-taiwil.service";
import { FileUploadService } from "../../../../../../shared/services/file-upload.service";
import { Observable, switchMap } from "rxjs";

export interface Modulo {
  id: number;
  nombre: string;
  clave?: string | undefined; // Clave puede estar sin definir
  duracion_horas: number;
  descripcion: string;
  nivel: string;
  costo?: number | undefined; // Costo puede estar indefinido
  requisitos?: string | undefined; // Requisitos pueden estar indefinidos
  area_id?: number | undefined; // ID del área puede estar indefinido
  especialidad_id?: number | undefined; // ID de especialidad puede estar indefinido
  tipo_curso_id?: number | undefined; // ID del tipo de curso puede estar indefinido
  vigencia_inicio?: string | undefined; // Fecha de vigencia puede estar indefinida
  fecha_publicacion?: string | undefined; // Fecha de publicación puede estar indefinida
  ultima_actualizacion?: string | undefined; // Última actualización puede estar indefinida
  // Nuevas propiedades para notas adicionales
  notas: {
    materiales?: string | undefined;
    equipamiento?: string | undefined;
    requisitos?: string | undefined;
    evaluacion?: string | undefined;
    general?: string | undefined;
  };

  firmas: {
    revisado: { nombre: string; cargo: string };
    autorizado: { nombre: string; cargo: string };
    elaborado: { nombre: string; cargo: string };
  };
  objetivos: {
    objetivo: string | undefined; // Objetivo del curso puede estar indefinido
    perfil_ingreso: string | undefined; // Perfil de ingreso
    perfil_egreso: string | undefined; // Perfil de egreso
    perfil_del_docente: string | undefined; // Perfil del docente
    metodologia: string | undefined; // Metodología de capacitación
    bibliografia: string | undefined; // Bibliografía
    criterios_acreditacion: string | undefined; // Criterios de acreditación
    reconocimiento: string | undefined; // Reconocimiento al alumno
  };
  contenidoProgramatico: {
    temas: Array<{
      tema_nombre: string;
      tiempo: number;
      competencias: string | undefined; // Competencias pueden estar indefinidas
      evaluacion: string | undefined; // Evaluación puede estar indefinida
      actividades: string | undefined; // Actividades pueden estar indefinidas
    }>;
  };
  materiales: Array<{
    descripcion: string;
    unidad_de_medida: string | undefined; // Unidad puede estar indefinida
    cantidad10?: number | undefined; // Cantidad para 10 puede estar indefinida
    cantidad15?: number | undefined; // Cantidad para 15 puede estar indefinida
    cantidad20?: number | undefined; // Cantidad para 20 puede estar indefinida
  }>;
  equipamiento: Array<{
    descripcion: string;
    unidad_de_medida: string | undefined; // Unidad puede estar indefinida
    cantidad10?: number | undefined; // Cantidad para 10 puede estar indefinida
    cantidad15?: number | undefined; // Cantidad para 15 puede estar indefinida
    cantidad20?: number | undefined; // Cantidad para 20 puede estar indefinida
  }>;
  reviso_aprobo_texto?: string;
  codigo_formato?: string;
  version_formato?: number;
  fecha_emision_formato?: string;
}

// export interface EquipmentItem {
//   description: string;
//   unitOfMeasure?: string | undefined; // Unidad de medida puede estar indefinida
//   customUnitOfMeasure?: string | undefined; // Unidad de medida personalizada puede estar indefinida
//   quantity: number;
//   quantity10?: number | undefined; // Cantidad para 10 puede estar indefinida
//   quantity15?: number | undefined; // Cantidad para 15 puede estar indefinida
//   quantity20?: number | undefined; // Cantidad para 20 puede estar indefinida
// }

export interface UnitOption {
  value: string;
  label: string;
}

@Component({
  selector: "app-curso-modalidad-escuela",
  templateUrl: "./curso-modalidad-escuela.component.html",
  styles: `/* Asegura que el dimmer ocupe toda la pantalla */
  .ui.dimmer {
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1000; /* Asegura que esté por encima de todo */
  }
  
  /* Asegura que el loader esté centrado */
  .ui.mini.text.loader {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }`,
})
export class CursoModalidadEscuelaComponent implements OnInit, OnChanges {
  @Input() selectedCourseId!: number;

  areas: any[] = [];
  especialidades: any[] = [];
  tiposCurso: any[] = [];
  modulos = signal<Modulo[]>([]);
  selectedCourseDetails: any = null;
  alertMessage = signal<string | null>(null);
  alertTitle = signal<string | null>(null);
  alertType = signal<"success" | "error">("success");
  btnTitle = signal("GUARDAR");
    isSaving = signal(false);


    nuevoCurso = signal<Modulo>({
      id: 0,
    nombre: "",
    duracion_horas: 0,
    descripcion: "",
    nivel: "",
    clave: "",
    area_id: undefined,
    especialidad_id: undefined,
    tipo_curso_id: undefined,

    firmas: {
      revisado: { nombre: "", cargo: "Programas de Estudio" },
      autorizado: { nombre: "", cargo: "Directora Académica" },
      elaborado: { nombre: "", cargo: "Director General" },
    },
    vigencia_inicio: undefined,
    fecha_publicacion: undefined,
    objetivos: {
      objetivo: "",
      perfil_ingreso: "",
      perfil_egreso: "",
      perfil_del_docente: "",
      metodologia: "",
      bibliografia: "",
      criterios_acreditacion: "",
      reconocimiento: "",
    },
    contenidoProgramatico: { temas: [] },
    materiales: [],
    equipamiento: [],
    notas: {
      materiales: "",
      equipamiento: '',
      requisitos: '',
      evaluacion: ''
    },
        reviso_aprobo_texto: "Coordinación de Gestión de la Calidad",
    codigo_formato: "DA-PP-CAE-01",
    version_formato: 1,
    fecha_emision_formato: new Date().toISOString().split('T')[0], // YYYY-MM-DD
    });
  // private apiUrl = `${environment.api}`;
  private apiUrl = signal(environment.api);


  btnTtle?: string;

  // constructor(private sanitizer: DomSanitizer, private http: HttpClient) { }

  constructor(private confirmService: ConfirmTaiwilService, private alertTaiwilService: AlertTaiwilService, private sanitizer: DomSanitizer, private http: HttpClient, private fileUploadService: FileUploadService) { }

    ngOnInit(): void {
    this.cargarAreas();
    this.cargarEspecialidades();
    this.cargarTiposCurso();

    if (this.selectedCourseId) {
      this.btnTitle.set("GUARDAR CAMBIOS");
      console.log(`🔹 Inicializando con ID: ${this.selectedCourseId}`);
      this.showCourseDetails(this.selectedCourseId);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes["selectedCourseId"] &&
      !changes["selectedCourseId"].firstChange
    ) {
      console.log(`🔹 ID del Curso actualizado: ${this.selectedCourseId}`);
      alert(`🔹 ID del Curso actualizado: ${this.selectedCourseId}`);
    }
  }
  archivoUrl = signal<any>(null);

  
    showCourseDetails(id: number) {
      this.http.get<any>(`${this.apiUrl()}/cursos/detalles/${id}`).subscribe({
        next: (data) => {
          this.archivoUrl.set(data.archivo_url);
  
          const updatedCourse: Modulo = {
            ...this.nuevoCurso(), // Keep default structure
            ...data, // Override with API data
            id: Number(data.id),
            vigencia_inicio: isNaN(new Date(data.vigencia_inicio).getTime())
              ? ""
              : new Date(data.vigencia_inicio).toISOString().split("T")[0],
            fecha_publicacion: isNaN(new Date(data.fecha_publicacion).getTime())
              ? ""
              : new Date(data.fecha_publicacion).toISOString().split("T")[0],
            // duracion_horas: Number(data.duracion_horas),
            duracion_horas: this.duracionCalculada,
            costo: data.costo !== undefined ? Number(data.costo) : undefined,
            area_id: data.area_id !== undefined ? Number(data.area_id) : undefined,
            especialidad_id: data.especialidad_id !== undefined ? Number(data.especialidad_id) : undefined,
            tipo_curso_id: data.tipo_curso_id !== undefined ? Number(data.tipo_curso_id) : undefined,
            objetivos: {
              ...this.nuevoCurso().objetivos,
              ...data.fichaTecnica,
            },
            contenidoProgramatico: {
              temas: Array.isArray(data.contenidoProgramatico)
                ? data.contenidoProgramatico.map((t: any) => ({
                  id: Number(t.id),
                  tema_nombre: t.tema_nombre,
                  tiempo: Number(t.tiempo) || 0,
                  competencias: t.competencias || undefined,
                  evaluacion: t.evaluacion || undefined,
                  actividades: t.actividades || undefined,
                }))
                : [],
            },
            materiales: Array.isArray(data.materiales)
              ? data.materiales.map((m: any) => ({
                id: Number(m.id),
                descripcion: m.descripcion,
                unidad_de_medida: m.unidad_de_medida || undefined,
                cantidad10: m.cantidad_10 !== undefined ? Number(m.cantidad_10) : undefined,
                cantidad15: m.cantidad_15 !== undefined ? Number(m.cantidad_15) : undefined,
                cantidad20: m.cantidad_20 !== undefined ? Number(m.cantidad_20) : undefined,
              }))
              : [],
            equipamiento: Array.isArray(data.equipamiento)
              ? data.equipamiento.map((e: any) => ({
                id: Number(e.id),
                descripcion: e.descripcion,
                unidad_de_medida: e.unidad_de_medida || undefined,
                cantidad10: e.cantidad_10 !== undefined ? Number(e.cantidad_10) : undefined,
                cantidad15: e.cantidad_15 !== undefined ? Number(e.cantidad_15) : undefined,
                cantidad20: e.cantidad_20 !== undefined ? Number(e.cantidad_20) : undefined,
              }))
              : [],
            firmas: {
              revisado: {
                nombre: data.firmas.revisado?.nombre || "",
                cargo: data.firmas.revisado?.cargo || "",
              },
              autorizado: {
                nombre: data.firmas.autorizado?.nombre || "",
                cargo: data.firmas.autorizado?.cargo || "",
              },
              elaborado: {
                nombre: data.firmas.elaborado?.nombre || "",
                cargo: data.firmas.elaborado?.cargo || "",
              },
            },
          };
  
          this.nuevoCurso.set(updatedCourse);
          console.log("Curso cargado:", this.nuevoCurso());
        },
        error: (err) => {
          console.error("Error al cargar los detalles del curso:", err);
          this.alertMessage.set("Error al cargar los detalles del curso. Intenta más tarde.");
          this.alertTitle.set("Error");
          this.alertType.set("error");
        },
      });
    }


  cargarAreas(): void {
    this.http.get<any[]>(`${this.apiUrl}/areas`).subscribe({
      next: (data) => {
        this.areas = data;
      },
      error: (err) => {
        console.error("Error al cargar áreas:", err);
      },
    });
  }

  cargarEspecialidades(): void {
    this.http.get<any[]>(`${this.apiUrl}/especialidades`).subscribe({
      next: (data) => {
        this.especialidades = data;
      },
      error: (err) => {
        console.error("Error al cargar especialidades:", err);
      },
    });
  }

  cargarTiposCurso(): void {
    this.http.get<any[]>(`${this.apiUrl}/tiposCurso`).subscribe({
      next: (data) => {
        this.tiposCurso = data;
      },
      error: (err) => {
        console.error("Error al cargar tipos de curso:", err);
      },
    });
  }


agregarCurso(): void {
  this.isSaving.set(true);
  this.alertMessage.set(null); // Reset previous alert

  const currentCourse = this.nuevoCurso();
  const file = this.selectedFile();

  // Si hay archivo seleccionado Y no ha sido subido aún (en Aceptar())
  if (file && !this.alreadyUploadedFileUrl) {
    this.fileUploadService.uploadTemario(file).pipe(
      switchMap((response) => {
        const formData = this.prepareFormData(currentCourse, response.fileUrl);
        return this.sendCourseRequest(formData);
      })
    ).subscribe({
      next: (response) => this.handleSuccess(response),
      error: (err) => this.handleError(err)
    });
  } else {
    // Usar la URL ya subida o proceder sin archivo
    const formData = this.prepareFormData(currentCourse, this.alreadyUploadedFileUrl || undefined);
    this.sendCourseRequest(formData).subscribe({
      next: (response) => this.handleSuccess(response),
      error: (err) => this.handleError(err)
    });
  }
}

  // Método auxiliar para preparar el FormData
  private prepareFormData(currentCourse: any, fileUrl: string = ''): FormData {
    const formData = new FormData();

    // Agregar propiedades básicas
    formData.append("nombre", currentCourse.nombre);
    formData.append("costo", currentCourse.costo?.toString() || "");
    formData.append("duracion_horas", currentCourse.duracion_horas.toString());
    formData.append("descripcion", currentCourse.descripcion);
    formData.append("nivel", currentCourse.nivel);
    formData.append("vigencia_inicio", currentCourse.vigencia_inicio?.toString() || "");
    formData.append("fecha_publicacion", currentCourse.fecha_publicacion?.toString() || "");
    formData.append("clave", currentCourse.clave?.toString() || "");
    formData.append("area_id", currentCourse.area_id?.toString() || "");
    formData.append("especialidad_id", currentCourse.especialidad_id?.toString() || "");
    formData.append("tipo_curso_id", "3");

    // Agregar URL del archivo si existe
    // Agregar URL del archivo si existe
    // if (fileUrl) {
    //   formData.append("archivo_url", fileUrl);
    // }
    // Manejo explícito del archivo:
    if (this.selectedFile()) {
      // Caso: Hay un nuevo archivo seleccionado
      formData.append("archivo_url", fileUrl);
    } else if (this.archivoUrl()) {
      // Caso: No hay archivo nuevo pero hay URL existente (edición sin modificar archivo)
      formData.append("archivo_url", this.archivoUrl());
    }



    // Firmas
    formData.append("revisado_por", currentCourse.firmas?.revisado?.nombre?.toString() || "");
    formData.append("cargo_revisado_por", currentCourse.firmas?.revisado?.cargo?.toString() || "");
    formData.append("autorizado_por", currentCourse.firmas?.autorizado?.nombre?.toString() || "");
    formData.append("cargo_autorizado_por", currentCourse.firmas?.autorizado?.cargo?.toString() || "");
    formData.append("elaborado_por", currentCourse.firmas?.elaborado?.nombre?.toString() || "");
    formData.append("cargo_elaborado_por", currentCourse.firmas?.elaborado?.cargo?.toString() || "");

    // Datos JSON
    formData.append("objetivos", JSON.stringify(currentCourse.objetivos));
    formData.append("contenidoProgramatico", JSON.stringify(currentCourse.contenidoProgramatico));
    formData.append("materiales", JSON.stringify(currentCourse.materiales));
    formData.append("nota_materiales", this.nuevoCurso().notas?.materiales || '');

    formData.append("equipamiento", JSON.stringify(currentCourse.equipamiento));
    formData.append("nota_equipamiento", this.nuevoCurso().notas?.equipamiento || '');


        formData.append("codigo_formato", currentCourse.codigo_formato || '');
    formData.append("version_formato", currentCourse.version_formato?.toString() || '1');
    formData.append("fecha_emision_formato", currentCourse.fecha_emision_formato || '');
    formData.append("reviso_aprobo_texto", currentCourse.reviso_aprobo_texto || '');
    // Debug: Mostrar contenido de FormData
    console.log("Contenido de FormData:");
    for (const [key, value] of (formData as any).entries()) {
      console.log(key, value);
    }

    return formData;
  }

  // Método auxiliar para enviar la solicitud
  private sendCourseRequest(formData: FormData): Observable<any> {
    const url = this.selectedCourseId
      ? `${this.apiUrl()}/cursos/${this.selectedCourseId}`
      : `${this.apiUrl()}/cursos`;

    return this.selectedCourseId
      ? this.http.put(url, formData)
      : this.http.post<Modulo>(url, formData);
  }

  // Manejo de respuesta exitosa
  // Manejo de respuesta exitosa
  private handleSuccess(response: any): void {
    this.isSaving.set(false);
    if (this.selectedCourseId) {
      this.alertMessage.set(`Curso actualizado correctamente con ID: ${this.selectedCourseId}`);
      this.alertTaiwilService.showTailwindAlert("Curso actualizado correctamente con ID" + this.selectedCourseId, "success");
      this.showCourseDetails(this.selectedCourseId)
    } else {
      this.modulos.update(modulos => [...modulos, response as Modulo]);
      this.resetNuevoCurso();
      // this.eliminarArchivo();

      this.alertMessage.set("Curso agregado correctamente.");
      this.alertTaiwilService.showTailwindAlert("Curso agregado correctamente", "success");
    }
    this.alertTitle.set("Éxito");
    this.alertType.set("success");
  }

  // Manejo de errores
  private handleError(err: any): void {
    this.isSaving.set(false);
    console.error("Error en la operación del curso:", err);
    this.alertMessage.set(
      this.selectedCourseId
        ? "Error al actualizar el curso"
        : "Error al agregar el curso"
    );
    this.alertTaiwilService.showTailwindAlert(this.selectedCourseId
      ? "Error al actualizar el curso"
      : "Error al agregar el curso", "error");
    this.alertTitle.set("Error");
    this.alertType.set("error");
  }

    obtenerNombreArchivo(url: string): string {
    if (!url) return '';
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      return pathname.split('/').pop() || 'documento.pdf';
    } catch {
      return 'documento.pdf';
    }
  }

 

  resetNuevoCurso(): void {
    this.selectedFile.set(null);
    this.nuevoCurso.set({
      id: 0,
      nombre: "",
      duracion_horas: 0,
      descripcion: "",
      nivel: "",
      clave: "",
      area_id: undefined,
      especialidad_id: undefined,
      tipo_curso_id: undefined,
                  version_formato: 1, // Valor por defecto
      fecha_emision_formato: "", 
      codigo_formato: "",
      reviso_aprobo_texto: "",
      notas: {
        materiales: "",
        equipamiento: '',
        requisitos: '',
        evaluacion: ''
      },
      firmas: {
        revisado: { nombre: "", cargo: "Programas de Estudio" },
        autorizado: { nombre: "", cargo: "Directora Académica" },
        elaborado: { nombre: "", cargo: "Director General" },
      },
      objetivos: {
        objetivo: "",
        perfil_ingreso: "",
        perfil_egreso: "",
        perfil_del_docente: "",
        metodologia: "",
        bibliografia: "",
        criterios_acreditacion: "",
        reconocimiento: "",
      },
      contenidoProgramatico: { temas: [] },
      materiales: [],
      equipamiento: [],
    });

        const formData = new FormData();

    formData.append("archivo_url", "");
    // this.archivoUrl.set(null); // Solo esto, sin los paréntesis ()
    // Limpiar tanto la URL como el archivo seleccionado
    this.archivoUrl.set(null);
    this.selectedFile.set(null);
  }

  // Métodos para agregar y eliminar temas
  agregarTema(): void {
    this.nuevoCurso().contenidoProgramatico.temas.push({
      tema_nombre: "",
      tiempo: 0,
      competencias: undefined,
      evaluacion: undefined,
      actividades: undefined,
    });
  }

  // eliminarTema(index: number): void {
  //   this.nuevoCurso.contenidoProgramatico.temas.splice(index, 1);
  // }
    eliminarTema(index: number): void {
    this.nuevoCurso.update(current => {
      const newTemas = [...current.contenidoProgramatico.temas];
      newTemas.splice(index, 1);
      return {
        ...current,
        contenidoProgramatico: {
          temas: newTemas
        }
      };
    });
  }

  // Métodos para agregar y eliminar materiales
  agregarMaterial() {
    this.nuevoCurso.set({
      ...this.nuevoCurso(),
      materiales: [
        ...this.nuevoCurso().materiales,
        {
          // id: null,
          descripcion: '',
          unidad_de_medida: undefined,
          cantidad10: undefined,
          cantidad15: undefined,
          cantidad20: undefined
        }
      ]
    });
  }
  // eliminarMaterial(index: number): void {
  //   this.nuevoCurso.materiales.splice(index, 1);
  // }
  eliminarMaterial(index: number) {
    const materialesActualizados = [...this.nuevoCurso().materiales];
    materialesActualizados.splice(index, 1);

    this.nuevoCurso.set({
      ...this.nuevoCurso(),
      materiales: materialesActualizados
    });
  }
  // Métodos para agregar y eliminar equipamiento

  agregarEquipamiento() {
    this.nuevoCurso.set({
      ...this.nuevoCurso(),
      equipamiento: [
        ...this.nuevoCurso().equipamiento,
        {
          // id: null,
          descripcion: '',
          unidad_de_medida: undefined,
          cantidad10: undefined,
          cantidad15: undefined,
          cantidad20: undefined
        }
      ]
    });
  }

  eliminarEquipamiento(index: number): void {
    this.nuevoCurso().equipamiento.splice(index, 1);
  }
  get duracionCalculada(): number {
    return this.calcularTotalHoras();
  }
  calcularTotalHoras(): number {
    return this.nuevoCurso().contenidoProgramatico.temas.reduce(
      (total, tema) => total + tema.tiempo,
      0
    );
  }


  unitOptions: UnitOption[] = [
    { value: "PIEZA", label: "PIEZA" },
    { value: "OTRO", label: "OTRO" },
    { value: "SERVICIO", label: "SERVICIO" },
  ];

  showModal = false;
  newUnitName = "";

  mostrarFormulario: boolean = false;

  mostrarModalSubirArchivo() {
    this.mostrarFormulario = true;
  }

  //*************************FILE */}
  selectedFile = signal<File | null>(null);
fileExtension: string = "";
  isDragging = signal(false);
  // Evento cuando se selecciona un archivo

  // Subir el archivo
  // uploadFile(file: File): void {
  //   console.log(file);
  // }

  // Eliminar archivo
  removeFile() {
    this.selectedFile.set(null);
  }
  // Obtener la extensión del archivo
  getFileExtension(fileName: string): string {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    return ext;
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(false);

    if (event.dataTransfer?.files.length) {
      const file = event.dataTransfer.files[0];
      this.selectedFile.set(file);
      this.fileExtension = this.getFileExtension(file.name);
    }
  }


  onDragLeave(event: DragEvent): void {
    this.isDragging.set(false);
  }
  url: any = "";
  // Add this method to handle file selection
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile.set(input.files[0]);
    }
  }


  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.selectedFile.set(input.files[0]);
      this.fileExtension = this.getFileExtension(input.files[0].name);


    }
  }

  page: number = 1;
  totalPages!: number;
  isLoaded: boolean = false;

  callbackFn(pdf: PDFDocumentProxy) {
    this.totalPages = pdf.numPages;
    this.isLoaded = true;
  }

  nextTep() {
    this.page++;
  }
  prevTep() {
    this.page--;
  }


  // ARCHIVOS 
    // Función para abrir en nueva pestaña
  abrirEnNuevaPestana(url: string): void {
    window.open(url, '_blank');
  }
  async descargarArchivo(url: string): Promise<void> {
    try {
      // Solución alternativa para problemas de CORS
      if (url.startsWith('blob:')) {
        // Si es un blob, usamos el método estándar
        const link = document.createElement('a');
        link.href = url;
        link.download = this.obtenerNombreArchivo(url) || 'documento.pdf';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      // Para URLs remotas, usamos fetch
      const response = await fetch(url, {
        mode: 'cors', // Intenta con CORS
        cache: 'no-cache'
      });

      if (!response.ok) throw new Error('Error al obtener el archivo');

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = this.obtenerNombreArchivo(url) || 'documento.pdf';
      link.style.display = 'none';

      document.body.appendChild(link);
      link.click();

      // Limpieza
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      }, 100);

    } catch (error) {
      console.error('Error al descargar el archivo:', error);

      // Fallback: abrir en nueva pestaña si la descarga falla
      window.open(url, '_blank');

      // Opcional: mostrar notificación al usuario
      // this.mostrarNotificacion('Error', 'No se pudo descargar el archivo. Se abrirá en una nueva pestaña.', 'error');
    }
  }
  // Cuando se renderiza la miniatura
  onThumbnailRendered(event: any) {
    console.log('Miniatura del PDF renderizada');
  }
  eliminarArchivo() {
    // this
    this.confirmService.showTailwindConfirm(
      '¿Estás seguro de que quieres eliminar este Archivo?',
      'Sí, eliminar',
      'Cancelar',
      'danger'
    ).subscribe(confirmed => {
      if (confirmed) {
        const formData = new FormData();

        formData.append("archivo_url", "");
        // this.archivoUrl.set(null); // Solo esto, sin los paréntesis ()
        // Limpiar tanto la URL como el archivo seleccionado
        this.archivoUrl.set(null);
        this.selectedFile.set(null); // Asegurarse de limpiar también el archivo seleccionado

        this.obtenerNombreArchivo(this.archivoUrl());
        // Lógica cuando el usuario acepta
        console.log('Usuario confirmó la acción');
      } else {
        // Lógica cuando el usuario cancela
        console.log('Usuario canceló la acción');
      }
    });
    console.log('Miniatura del PDF renderizada');
  }

  // En tu componente TypeScript
  uploadProgress = 0;
  isLoadingPreview = false;
private alreadyUploadedFileUrl: string | null = null;

async Aceptar() {
  const file = this.selectedFile();
  if (!file) return;

  try {
    // Mostrar progreso simulado mientras se sube el archivo
    const uploadInterval = setInterval(() => {
      this.uploadProgress = Math.min(this.uploadProgress + 10, 90);
    }, 200);

    // Subir el archivo usando el servicio fileUploadService
    const fileUrl = await this.fileUploadService.uploadTemario(file).toPromise();
    
    // Guardar la URL para usarla luego en agregarCurso()
    this.alreadyUploadedFileUrl = fileUrl.fileUrl;

    clearInterval(uploadInterval);
    this.uploadProgress = 100;

    // Mostrar vista previa
    this.isLoadingPreview = true;
    this.archivoUrl.set(fileUrl.fileUrl);

    // Pequeño delay para que se vea el 100%
    await new Promise(resolve => setTimeout(resolve, 500));

    // Cerrar modal
    this.mostrarFormulario = false;
  } catch (error) {
    this.alertTaiwilService.showTailwindAlert("Error al subir el archivo", 'error');
    this.alreadyUploadedFileUrl = null; // Resetear en caso de error
  } finally {
    this.isLoadingPreview = false;
    this.uploadProgress = 0;
  }
}


}
