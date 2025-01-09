import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ListadoCursosComponent } from './views/cursos/listado-cursos/listado-cursos.component';
import { ListadoDocentesComponent } from './views/docentes/listado-docentes/listado-docentes.component';
import { RouterModule } from '@angular/router';
import { ListadoAlumnosComponent } from './views/alumnos/listado-alumnos/listado-alumnos.component';
import { AuthService } from '../../../shared/services/auth.service';
import { DocenteService } from '../../../shared/services/docente.service';
import { CursosdocentesService } from '../../../shared/services/cursosdocentes.service';
import { FilterPipe } from '../../../shared/pipes/filter.pipe';
import { ListadoCursosAprovadosComponent } from './views/cursos/listado-cursos-aprovados/listado-cursos-aprovados.component';
import { HistorialComponent } from './views/cursos/historial/historial.component';


@NgModule({
  declarations: [    FilterPipe,ListadoAlumnosComponent,ListadoCursosComponent,ListadoDocentesComponent, ListadoCursosAprovadosComponent, HistorialComponent],
  imports: [
    CommonModule,ReactiveFormsModule,FormsModule,RouterModule,
  ],
  providers:[AuthService,DocenteService,CursosdocentesService]
})
export class CommonsModule { }
