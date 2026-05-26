<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('username','password') displayInfo=realm.password && realm.registrationAllowed && !registrationDisabled??; section>
    <#if section = "form">
        <h2 id="kc-page-title">${msg("loginTitle",(realm.displayName!''))}</h2>
        <form id="kc-form-login" onsubmit="login.disabled = true; return true;" action="${url.loginAction}" method="post">
            <div class="form-group">
                <label for="username">
                    <#if !realm.loginWithEmailAllowed>${msg("username")}
                    <#elseif !realm.registrationEmailAsUsername>${msg("usernameOrEmail")}
                    <#else>${msg("email")}
                    </#if>
                </label>
                <input tabindex="1" id="username" class="pf-c-form-control" name="username" value="${(login.username!'')}" type="text" autofocus autocomplete="off"
                    aria-invalid="<#if messagesPerField.existsError('username','password')>true</#if>" />
            </div>
            <div class="form-group">
                <label for="password">${msg("password")}</label>
                <div class="pf-c-input-group">
                    <input tabindex="2" id="password" class="pf-c-form-control" name="password" type="password" autocomplete="current-password"
                        aria-invalid="<#if messagesPerField.existsError('username','password')>true</#if>" />
                    <button class="pf-c-button pf-m-control" type="button" aria-label="${msg('showPassword')}"
                        aria-controls="password" data-password-toggle
                        data-icon-show="fa fa-eye" data-icon-hide="fa fa-eye-slash"
                        data-label-show="${msg('showPassword')}" data-label-hide="${msg('hidePassword')}">
                        <i class="fa fa-eye" aria-hidden="true"></i>
                    </button>
                </div>
            </div>
            <#if realm.rememberMe && !usernameEditDisabled??>
                <div class="form-group">
                    <div id="kc-form-options">
                        <div class="checkbox">
                            <label>
                                <#if login.rememberMe??>
                                    <input tabindex="3" id="rememberMe" name="rememberMe" type="checkbox" checked> ${msg("rememberMe")}
                                <#else>
                                    <input tabindex="3" id="rememberMe" name="rememberMe" type="checkbox"> ${msg("rememberMe")}
                                </#if>
                            </label>
                        </div>
                    </div>
                </div>
            </#if>
            <div id="kc-form-buttons" class="form-group">
                <input type="hidden" id="id-hidden-input" name="credentialId" <#if auth.selectedCredential?has_content>value="${auth.selectedCredential}"</#if>/>
                <input tabindex="4" class="pf-c-button pf-m-primary" name="login" id="kc-login" type="submit" value="${msg("doLogIn")}"/>
            </div>
        </form>
    <#elseif section = "info">
        <#if realm.password && realm.registrationAllowed && !registrationDisabled??>
            <div id="kc-registration-container">
                <div id="kc-registration">
                    <span>${msg("noAccount")} <a tabindex="6" href="${url.registrationUrl}">${msg("doRegister")}</a></span>
                </div>
            </div>
        </#if>
    </#if>
</@layout.registrationLayout>
