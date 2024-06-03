import { Component, Inject, ElementRef, ViewChild} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PaginationInstance } from 'ngx-pagination';
import { NgxSpinnerService } from 'ngx-spinner';
import { MensajeService } from 'src/app/core/services/mensaje.service';
import { LoadingStates } from 'src/app/global/global';

import { Inmueble } from 'src/app/models/inmueble';
import { InmueblesService } from 'src/app/core/services/inmueble.service';
import { Area } from 'src/app/models/Area';
import { AreasService } from 'src/app/core/services/areas.service';

import * as QRCode from 'qrcode-generator';

@Component({
  selector: 'app-traslados',
  templateUrl: './traslados.component.html',
  styleUrls: ['./traslados.component.css']
})
export class TrasladosComponent {
  @ViewChild('searchItem') searchItem!: ElementRef;
  @ViewChild('closebutton') closebutton!: ElementRef;
  public isUpdatingfoto: boolean = false;
  public imgPreview: string = '';
  public QrPreview: string = '';
  inmueblesForm!: FormGroup;
  QrBase64!: string;
  public isUpdatingImg: boolean = false;
  public isUpdatingEmblema: boolean = false;
  isLoading = LoadingStates.neutro;
  idUpdate!: number;
  isModalAdd = true;
  inmueble!: Inmueble;
  inmuebles: Inmueble[] = [];
  areas: Area[] = [];
  inmuebleFilter: Inmueble[] = [];
  imagenAmpliada: string | null = null;
  estatusBtn = true;
  verdadero = 'Activo';
  falso = 'Inactivo';
  estatusTag = this.verdadero;

  constructor(
    @Inject('CONFIG_PAGINATOR') public configPaginator: PaginationInstance,
    private spinnerService: NgxSpinnerService,
    private mensajeService: MensajeService,
    private formBuilder: FormBuilder,
    public inmueblesService: InmueblesService,
    public areasService: AreasService
  ) {
    this.inmueblesService.refreshListInmuebles.subscribe(() =>
      this.getInmuebles()
    );
    this.getInmuebles();
    this.creteForm();
    this.getAreas();
  }
  setEstatus() {
    this.estatusTag = this.estatusBtn ? this.verdadero : this.falso;
  }
  getAreas() {
    this.isLoading = LoadingStates.trueLoading;
    this.areasService.getAll().subscribe({
      next: (dataFromAPI) => {
        this.areas = dataFromAPI;
      },
    });
  }

  getInmuebles() {
    this.isLoading = LoadingStates.trueLoading;
    this.inmueblesService.getAll().subscribe({
      next: (dataFromAPI) => {
        this.inmuebles = dataFromAPI;
        this.inmuebleFilter = this.inmuebles;
        this.isLoading = LoadingStates.falseLoading;
      },
      error: () => {
        this.isLoading = LoadingStates.errorLoading;
      },
    });
  }

  creteForm() {
    this.inmueblesForm = this.formBuilder.group({
      id: [null],
      codigo: [''],
      nombre: [
        '',
        [
          Validators.maxLength(22),
          Validators.minLength(2),
          Validators.required,
        ],
      ],
      cantidad: ['', [Validators.maxLength(10), Validators.required]],
      descripcion: ['', [Validators.required]],
      imagenBase64: [''],
      qrBase64: [''],
      areasDeResgualdo: [null, Validators.required],
      estatus: [true],
    });
  }

  resetForm() {
    this.closebutton.nativeElement.click();
    this.inmueblesForm.reset();
  }

  setDataModalUpdate(dto: Inmueble) {
    this.isModalAdd = false;
    this.idUpdate = dto.id;
    this.inmueblesForm.patchValue({
      id: dto.id,
      codigo: dto.codigo,
      nombre: dto.nombre,
      cantidad: dto.cantidad,
      descripcion: dto.descripcion,
      imagenBase64: '',
      QrBase64: '',
      estatus: dto.estatus,
      areasDeResgualdo: dto.area ? dto.area.id : null,
    });
    console.log(this.inmueblesForm);
  }

  editarInmueble() {
    this.inmueble = this.inmueblesForm.value as Inmueble;
    const inmueble = this.inmueblesForm.get('id')?.value;
    const area = this.inmueblesForm.get('areasDeResgualdo')?.value;
    const imagenBase64 = this.inmueblesForm.get('imagenBase64')?.value;
    const QrBase64 = this.inmueblesForm.get('QrBase64')?.value;
    console.log(imagenBase64);
    console.log(QrBase64);

    this.imgPreview = '';
    this.QrPreview = '';

    this.inmueble.area = { id: area } as Area;

    if (!imagenBase64 && !QrBase64) {
      const formData = { ...this.inmueble };

      this.spinnerService.show();

      this.inmueblesService.put(inmueble, formData).subscribe({
        next: () => {
          this.spinnerService.hide();
          this.mensajeService.mensajeExito(
            'Inmueble actualizado correctamente'
          );
          this.resetForm();
          this.configPaginator.currentPage = 1;
        },
        error: (error) => {
          this.spinnerService.hide();
          this.mensajeService.mensajeError(error);
        },
      });
    } else if (imagenBase64 && QrBase64) {
      const formData = { ...this.inmueble, imagenBase64, QrBase64 };
      this.spinnerService.show();

      this.inmueblesService.put(inmueble, formData).subscribe({
        next: () => {
          this.spinnerService.hide();
          this.mensajeService.mensajeExito(
            'Candidato actualizado correctamente'
          );
          this.resetForm();
          this.configPaginator.currentPage = 1;
        },
        error: (error) => {
          this.spinnerService.hide();
          this.mensajeService.mensajeError(error);
        },
      });
    } else {
      console.error(
        'Error: No se encontró una representación válida en base64 de la imagen.'
      );
    }
  }

  deleteItem(id: number, nameItem: string) {
    this.mensajeService.mensajeAdvertencia(
      `¿Estás seguro de eliminar el inmueble: ${nameItem}?`,
      () => {
        this.inmueblesService.delete(id).subscribe({
          next: () => {
            this.mensajeService.mensajeExito('Candidato borrado correctamente');
            this.configPaginator.currentPage = 1;
            this.searchItem.nativeElement.value = '';
          },
          error: (error) => this.mensajeService.mensajeError(error),
        });
      }
    );
  }
  onFileChange(event: Event) {
    const inputElement = event.target as HTMLInputElement;

    if (inputElement.files && inputElement.files.length > 0) {
      const file = inputElement.files[0];
      const reader = new FileReader();

      reader.onload = () => {
        const base64String = reader.result as string;
        const base64WithoutPrefix = base64String.split(';base64,').pop() || '';

        this.inmueblesForm.patchValue({
          imagenBase64: base64WithoutPrefix, // Contiene solo la representación en base64
        });
      };
      this.isUpdatingfoto = false;
      reader.readAsDataURL(file);
    }
  }

  async generarID() {
    const nombreControl = this.inmueblesForm.get('nombre');

    if (nombreControl) {
      const nombre = nombreControl.value.toUpperCase();

      const letraAleatoria = String.fromCharCode(
        65 + Math.floor(Math.random() * 26)
      ).toUpperCase();
      const numerosAleatorios = Array.from({ length: 3 }, () =>
        Math.floor(Math.random() * 10)
      ).join('');

      // Obtener la fecha actual en formato DDMMYYYY
      const fecha = new Date();
      const dia = String(fecha.getDate()).padStart(2, '0');
      const mes = String(fecha.getMonth() + 1).padStart(2, '0');
      const año = fecha.getFullYear();
      const fechaActual = `${dia}${mes}${año}`;

      // Generar el ID con prefijo "MAG" y fecha al final
      const codigo = `MAG${nombre.slice(
        0,
        3
      )}${letraAleatoria}${numerosAleatorios}${fechaActual}`;

      const qr = QRCode(0, 'H');
      qr.addData(codigo);
      qr.make();

      const qrDataURL = qr.createDataURL(4);
      const qrBase64 = qrDataURL.split(',')[1]; // Extraer solo la parte base64

      console.log('idGenerado:', codigo);
      console.log('qrBase64:', qrBase64);

      // Asignar el valor de idGenerado y qrBase64 al formulario
      this.inmueblesForm.patchValue({ codigo: codigo, qrBase64: qrBase64 });
    }
  }

  agregar() {
    this.inmueble = this.inmueblesForm.value as Inmueble;
    const imagenBase64 = this.inmueblesForm.get('imagenBase64')?.value;
    const qrBase64 = this.inmueblesForm.get('qrBase64')?.value;
    const areaId = this.inmueblesForm.get('areasDeResgualdo')?.value;

    // Buscar el nombre del área seleccionada
    const areaSeleccionada = this.areas.find((area) => area.id === areaId);
    if (!areaSeleccionada) {
      this.mensajeService.mensajeError(
        'El área de resguardo seleccionada no es válida.'
      );
      return;
    }

    // Crear el objeto inmueble con el área completa
    const inmuebleSinId = { ...this.inmueble, area: areaSeleccionada };

    console.log(inmuebleSinId);

    if (imagenBase64 && qrBase64) {
      const formData = { ...inmuebleSinId, imagenBase64, qrBase64 }; // Utilizar idGenerado como el valor del código
      this.spinnerService.show();
      this.inmueblesService.post(formData).subscribe({
        next: () => {
          this.spinnerService.hide();
          this.mensajeService.mensajeExito('Inmueble guardado correctamente');
          this.resetForm();
          this.configPaginator.currentPage = 1;
        },
        error: (error) => {
          this.spinnerService.hide();
          this.mensajeService.mensajeError(error);
        },
      });
    } else {
      this.spinnerService.hide();
      this.mensajeService.mensajeError(
        'Error: No se encontró una representación válida de la imagen o QR.'
      );
    }
  }

  handleChangeAdd() {
    this.isUpdatingImg = false;
    this.isUpdatingEmblema = false;
    if (this.inmueblesForm) {
      this.inmueblesForm.reset();
      const estatusControl = this.inmueblesForm.get('estatus');
      if (estatusControl) {
        estatusControl.setValue(true);
      }
      this.isModalAdd = true;
    }
  }

  submit() {
    if (this.isModalAdd === false) {
      this.editarInmueble();
    } else {
      this.agregar();
    }
  }

  mostrarImagenAmpliada(rutaImagen: string) {
    this.imagenAmpliada = rutaImagen;
    const modal = document.getElementById('modal-imagen-ampliada');
    if (modal) {
      modal.classList.add('show');
      modal.style.display = 'block';
    }
  }
  cerrarModal() {
    this.imagenAmpliada = null;
    const modal = document.getElementById('modal-imagen-ampliada');
    if (modal) {
      modal.classList.remove('show');
      modal.style.display = 'none';
    }
  }
  handleChangeSearch(event: any) {
    const inputValue = event.target.value;
    const valueSearch = inputValue.toLowerCase();

    this.inmuebleFilter = this.inmuebles.filter(
      (inmueble) =>
        inmueble.nombre.toLowerCase().includes(valueSearch) ||
        inmueble.codigo.toLowerCase().includes(valueSearch) ||
        inmueble.cantidad.toString().includes(valueSearch)
    );

    this.configPaginator.currentPage = 1;
  }
  onPageChange(number: number) {
    this.configPaginator.currentPage = number;
  }
}
