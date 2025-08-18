import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { AppComponent } from './app.component';

@NgModule({
  declarations: [
    AppComponent // uygulamanın ana component'i
  ],
  imports: [
    BrowserModule,   
    HttpClientModule 
  ],
  providers: [],
  bootstrap: [AppComponent] 
})
export class AppModule { }
 